import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// --- Schemas ---

export const DecisionSchema = z.object({
  text: z.string(),
  owner: z.string().optional(),
  relatedIssue: z.string().optional(),
});

export const ActionItemSchema = z.object({
  task: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  status: z.enum(["pending", "in-progress", "completed"]),
  relatedIssue: z.string().optional(),
});

export const CommitDecisionLinkSchema = z.object({
  commitHash: z.string(),
  commitAuthor: z.string(),
  commitDate: z.string(),
  decisionId: z.string(),
  decisionText: z.string(),
  repo: z.string(),
  confidenceScore: z.number().min(0).max(1),
  linkType: z.enum(["implements", "fixes", "refactors", "related"]),
  createdAt: z.string(),
  createdBy: z.enum(["auto", "manual"]),
});

export const ImpactSummarySchema = z.object({
  filesChanged: z.number(),
  reposImpacted: z.array(z.string()),
  authorsInvolved: z.array(z.string()),
});

export const ContextEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: z.enum(["meeting", "decision", "context", "action-item"]),
  category: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  contributors: z.array(z.string()).optional(),
  relatedRepos: z.array(z.string()).optional(),
  relatedLinks: z.array(z.string()).optional(),
  // Phase 2 additions
  linkedCommits: z.array(CommitDecisionLinkSchema).optional(),
  tags: z.array(z.string()).optional(),
  linkedActionItems: z.array(z.string()).optional(),
  impactSummary: ImpactSummarySchema.optional(),
  status: z.enum(["open", "in-progress", "completed", "pending"]).optional(),
});

export const MeetingEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  title: z.string(),
  summary: z.string(),
  participants: z.array(z.string()),
  decisions: z.array(DecisionSchema),
  actionItems: z.array(ActionItemSchema),
  vault: z.string(),
  notePath: z.string(),
  relatedRepos: z.array(z.string()).optional(),
});

export type Decision = z.infer<typeof DecisionSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type CommitDecisionLink = z.infer<typeof CommitDecisionLinkSchema>;
export type ImpactSummary = z.infer<typeof ImpactSummarySchema>;
export type ContextEntry = z.infer<typeof ContextEntrySchema>;
export type MeetingEntry = z.infer<typeof MeetingEntrySchema>;

export interface MemoryQueryResult {
  entries: ContextEntry[];
  totalCount: number;
  timeRange: { from: string; to: string };
}

export interface TeamContextSnapshot {
  timeframe: "week" | "month";
  summary: string;
  contributors: { name: string; commits: number; activity: string }[];
  recentDecisions: Decision[];
  pendingActionItems: ActionItem[];
  activeRepos: string[];
}

// --- Persistence Interface ---

export interface MemoryPersistence {
  save(entry: ContextEntry): Promise<string>;
  query(searchTerm: string, filters?: QueryFilters): Promise<ContextEntry[]>;
  getById(id: string): Promise<ContextEntry | null>;
  update(id: string, data: Partial<ContextEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  getAll(): ContextEntry[];
}

export interface QueryFilters {
  type?: string;
  author?: string;
  from?: Date;
  to?: Date;
  repos?: string[];
  tags?: string[];
  status?: string;
  linkedToCommit?: boolean;
  confidenceMin?: number;
}

// --- Shared filter logic ---

function filterEntries(
  entries: ContextEntry[],
  searchTerm: string,
  filters?: QueryFilters
): ContextEntry[] {
  let results = [...entries];

  if (filters?.type) {
    results = results.filter(e => e.type === filters.type);
  }
  if (filters?.author) {
    results = results.filter(e => e.contributors?.includes(filters.author!));
  }
  if (filters?.from) {
    results = results.filter(e => new Date(e.timestamp) >= filters.from!);
  }
  if (filters?.to) {
    results = results.filter(e => new Date(e.timestamp) <= filters.to!);
  }
  if (filters?.repos && filters.repos.length > 0) {
    results = results.filter(e =>
      e.relatedRepos?.some(r => filters.repos!.includes(r))
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter(e =>
      filters.tags!.some(t => e.tags?.includes(t))
    );
  }
  if (filters?.status) {
    results = results.filter(e => e.status === filters.status);
  }
  if (filters?.linkedToCommit === true) {
    results = results.filter(e => (e.linkedCommits?.length ?? 0) > 0);
  }
  if (filters?.linkedToCommit === false) {
    results = results.filter(e => (e.linkedCommits?.length ?? 0) === 0);
  }
  if (filters?.confidenceMin !== undefined) {
    results = results.filter(e =>
      e.linkedCommits?.some(lc => lc.confidenceScore >= filters.confidenceMin!)
    );
  }
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    results = results.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  return results;
}

// --- In-Memory Persistence (base class) ---

class InMemoryPersistence implements MemoryPersistence {
  protected store: Map<string, ContextEntry> = new Map();

  async save(entry: ContextEntry): Promise<string> {
    this.store.set(entry.id, entry);
    return entry.id;
  }

  async query(searchTerm: string, filters?: QueryFilters): Promise<ContextEntry[]> {
    return filterEntries(Array.from(this.store.values()), searchTerm, filters);
  }

  async getById(id: string): Promise<ContextEntry | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, data: Partial<ContextEntry>): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Entry not found: ${id}`);
    this.store.set(id, { ...existing, ...data });
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  getAll(): ContextEntry[] {
    return Array.from(this.store.values());
  }
}

// --- File-based Persistence (Phase 2) ---

class JsonFilePersistence extends InMemoryPersistence {
  private readonly filePath: string;

  constructor(filePath?: string) {
    super();
    this.filePath = filePath ?? join(homedir(), ".claude", "obsidian-mcp-memory.json");
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        const entries = JSON.parse(raw) as ContextEntry[];
        entries.forEach(e => this.store.set(e.id, e));
        console.error(`[Memory] Loaded ${entries.length} entries from disk`);
      }
    } catch (err: any) {
      console.error(`[Memory] Failed to load from ${this.filePath}: ${err.message}`);
    }
  }

  private flush(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      const data = JSON.stringify(Array.from(this.store.values()), null, 2);
      writeFileSync(this.filePath, data, "utf-8");
    } catch (err: any) {
      console.error(`[Memory] Failed to save to ${this.filePath}: ${err.message}`);
    }
  }

  async save(entry: ContextEntry): Promise<string> {
    await super.save(entry);
    this.flush();
    return entry.id;
  }

  async update(id: string, data: Partial<ContextEntry>): Promise<void> {
    await super.update(id, data);
    this.flush();
  }

  async delete(id: string): Promise<void> {
    await super.delete(id);
    this.flush();
  }
}

// --- MemoryClient ---

export class MemoryClient {
  private persistence: MemoryPersistence;

  constructor(persistence?: MemoryPersistence) {
    this.persistence = persistence ?? new JsonFilePersistence();
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async save(type: string, entry: Record<string, unknown>): Promise<string> {
    const id = this.generateId("entry");

    const contextEntry: ContextEntry = ContextEntrySchema.parse({
      id,
      timestamp: new Date().toISOString(),
      type,
      title: entry.title ?? "Untitled",
      summary: entry.summary ?? "",
      contributors: entry.participants,
      relatedRepos: entry.relatedRepos,
      tags: entry.tags,
      status: entry.status ?? "open",
    });

    await this.persistence.save(contextEntry);
    return id;
  }

  async saveMeeting(entry: MeetingEntry): Promise<string> {
    const validated = MeetingEntrySchema.parse(entry);
    // Use the provided ID so callers can reference it for decisions/action items
    const id = validated.id;

    const contextEntry: ContextEntry = ContextEntrySchema.parse({
      id,
      timestamp: validated.timestamp,
      type: "meeting",
      title: validated.title,
      summary: validated.summary,
      contributors: validated.participants,
      relatedRepos: validated.relatedRepos,
      linkedActionItems: [],
      linkedCommits: [],
      status: "open",
      tags: [],
    });

    await this.persistence.save(contextEntry);
    return id;
  }

  async saveDecision(
    text: string,
    meetingId: string,
    participants: string[],
    relatedRepos: string[],
    timestamp: string
  ): Promise<string> {
    const id = this.generateId("decision");
    const entry: ContextEntry = ContextEntrySchema.parse({
      id,
      timestamp,
      type: "decision",
      title: text,
      summary: text,
      contributors: participants,
      relatedRepos,
      relatedLinks: [`meeting:${meetingId}`],
      linkedCommits: [],
      tags: [],
      status: "open",
    });
    await this.persistence.save(entry);
    return id;
  }

  async saveActionItem(
    task: string,
    owner: string,
    dueDate: string,
    meetingId: string,
    timestamp: string
  ): Promise<string> {
    const id = this.generateId("actionitem");
    // Store owner + dueDate in summary as JSON; title holds the task text
    const meta = JSON.stringify({ owner, dueDate });
    const entry: ContextEntry = ContextEntrySchema.parse({
      id,
      timestamp,
      type: "action-item",
      title: task,
      summary: meta,
      contributors: [owner],
      relatedLinks: [`meeting:${meetingId}`],
      status: "pending",
      tags: [],
    });
    await this.persistence.save(entry);
    return id;
  }

  async query(searchQuery: string, filters?: QueryFilters): Promise<MemoryQueryResult> {
    const results = await this.persistence.query(searchQuery, filters);

    return {
      entries: results,
      totalCount: results.length,
      timeRange: {
        from:
          filters?.from?.toISOString() ??
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: filters?.to?.toISOString() ?? new Date().toISOString(),
      },
    };
  }

  async getById(id: string): Promise<ContextEntry | null> {
    return this.persistence.getById(id);
  }

  async update(id: string, data: Partial<ContextEntry>): Promise<void> {
    return this.persistence.update(id, data);
  }

  async addCommitLink(entryId: string, link: CommitDecisionLink): Promise<void> {
    const entry = await this.persistence.getById(entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);

    const existing = entry.linkedCommits ?? [];
    const alreadyLinked = existing.some(
      lc => lc.commitHash === link.commitHash && lc.repo === link.repo
    );
    if (alreadyLinked) return;

    await this.persistence.update(entryId, {
      linkedCommits: [...existing, link],
    });
  }

  async getTeamContext(timeframe: "week" | "month"): Promise<TeamContextSnapshot> {
    const days = timeframe === "week" ? 7 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const allEntries = await this.persistence.query("", { from });

    // Decisions in timeframe
    const decisionEntries = await this.persistence.query("", { type: "decision", from });
    const decisions: Decision[] = decisionEntries.map(e => ({
      text: e.title,
      owner: e.contributors?.[0],
    }));

    // All pending action items (not restricted to timeframe)
    const pendingAI = await this.persistence.query("", { type: "action-item", status: "pending" });
    const actionItems: ActionItem[] = pendingAI.map(e => {
      let meta: Record<string, string> = {};
      try { meta = JSON.parse(e.summary); } catch { /* summary not JSON */ }
      return {
        task: e.title,
        owner: e.contributors?.[0] ?? meta.owner ?? "unknown",
        dueDate: meta.dueDate ?? e.timestamp.substring(0, 10),
        status: "pending" as const,
      };
    });

    const repos = new Set<string>();
    const contributors = new Map<string, number>();

    for (const entry of allEntries) {
      entry.contributors?.forEach(c => {
        contributors.set(c, (contributors.get(c) || 0) + 1);
      });
      entry.relatedRepos?.forEach(r => repos.add(r));
    }

    return {
      timeframe,
      summary: `Actividad de equipo de los últimos ${days} días`,
      contributors: Array.from(contributors.entries()).map(([name, count]) => ({
        name,
        commits: count,
        activity: `${count} eventos registrados`,
      })),
      recentDecisions: decisions,
      pendingActionItems: actionItems,
      activeRepos: Array.from(repos),
    };
  }

  async listActionItems(
    owner?: string,
    status?: "pending" | "in-progress" | "completed"
  ): Promise<ActionItem[]> {
    const results = await this.persistence.query("", {
      type: "action-item",
      author: owner,
      status,
    });
    return results.map(e => {
      let meta: Record<string, string> = {};
      try { meta = JSON.parse(e.summary); } catch { /* summary not JSON */ }
      return {
        task: e.title,
        owner: e.contributors?.[0] ?? meta.owner ?? "unknown",
        dueDate: meta.dueDate ?? e.timestamp.substring(0, 10),
        status: (e.status as "pending" | "in-progress" | "completed") ?? "pending",
      };
    });
  }

  getAll(): ContextEntry[] {
    return this.persistence.getAll();
  }

  getEntriesCount(): number {
    return this.persistence.getAll().length;
  }
}

export const memoryClient = new MemoryClient();
