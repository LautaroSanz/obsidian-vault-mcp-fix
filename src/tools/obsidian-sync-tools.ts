import { z } from "zod";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { VAULTS, REPOS, TEAM_MEMBERS } from "../config.js";
import { memoryClient, ContextEntry } from "../memory.js";
import { buildKnowledgeGraph } from "../graph/builder.js";
import { toMermaid } from "../graph/visualizer.js";

export const SyncGraphToObsidianInputSchema = z.object({
  vault: z
    .enum(["FACULTAD", "DATAOILERS", "PROYECTOS"])
    .describe("Vault donde crear/actualizar las notas del equipo"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 60);
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function writeNote(path: string, content: string): void {
  writeFileSync(path, content, "utf-8");
}

function wl(name: string): string {
  return `[[${name}]]`;
}

function wlAlias(id: string, label: string): string {
  return `[[${id}|${label}]]`;
}

function statusEmoji(status?: string): string {
  if (status === "completed") return "✅";
  if (status === "in-progress") return "🔄";
  return "🔵";
}

// ─── Note generators ──────────────────────────────────────────────────────────

function buildPersonNote(
  name: string,
  role: string | undefined,
  email: string | undefined,
  entries: ContextEntry[]
): string {
  const meetings = entries.filter(
    e => e.type === "meeting" && e.contributors?.includes(name)
  );
  const decisions = entries.filter(
    e => e.type === "decision" && e.contributors?.includes(name)
  );
  const actionItems = entries.filter(
    e => e.type === "action-item" && e.contributors?.includes(name)
  );

  const lines: string[] = [`# ${name}`, ""];
  if (role) lines.push(`**Rol:** ${role}`);
  if (email) lines.push(`**Email:** ${email}`);
  lines.push("");

  if (meetings.length > 0) {
    lines.push(`## Reuniones (${meetings.length})`, "");
    for (const m of meetings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
      lines.push(`- ${wl(m.title)} — ${m.timestamp.substring(0, 10)}`);
    }
    lines.push("");
  }

  if (decisions.length > 0) {
    lines.push(`## Decisiones (${decisions.length})`, "");
    for (const d of decisions) {
      lines.push(`- ${statusEmoji(d.status)} ${wlAlias(slugify(d.title), d.title)}`);
    }
    lines.push("");
  }

  if (actionItems.length > 0) {
    lines.push(`## Action Items`, "");
    for (const ai of actionItems) {
      const done = ai.status === "completed";
      lines.push(`- [${done ? "x" : " "}] ${ai.title}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildRepoNote(
  repoName: string,
  entries: ContextEntry[]
): string {
  const decisions = entries.filter(
    e => e.type === "decision" && e.relatedRepos?.includes(repoName)
  );
  const meetings = entries.filter(
    e => e.type === "meeting" && e.relatedRepos?.includes(repoName)
  );

  // Unique committers to this repo (from linkedCommits across all decisions)
  const committers = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.linkedCommits ?? []) {
      if (link.repo === repoName) committers.add(link.commitAuthor);
    }
  }

  const lines: string[] = [`# ${repoName}`, ""];

  const repoConfig = REPOS[repoName];
  if (repoConfig?.url) lines.push(`**URL:** ${repoConfig.url}`, "");

  if (decisions.length > 0) {
    lines.push(`## Decisiones (${decisions.length})`, "");
    for (const d of decisions.sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
      const commits = d.linkedCommits?.filter(lc => lc.repo === repoName).length ?? 0;
      lines.push(
        `- ${statusEmoji(d.status)} ${wlAlias(slugify(d.title), d.title)}` +
          (commits > 0 ? ` — ${commits} commit${commits !== 1 ? "s" : ""}` : "")
      );
    }
    lines.push("");
  }

  if (meetings.length > 0) {
    lines.push(`## Reuniones`, "");
    for (const m of meetings) {
      lines.push(`- ${wl(m.title)} — ${m.timestamp.substring(0, 10)}`);
    }
    lines.push("");
  }

  if (committers.size > 0) {
    lines.push(`## Contribuidores`, "");
    for (const c of committers) {
      lines.push(`- ${wl(c)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildDecisionNote(d: ContextEntry): string {
  const lines: string[] = [`# ${d.title}`, ""];
  lines.push(`**Fecha:** ${d.timestamp.substring(0, 10)}`);
  lines.push(`**Estado:** ${d.status ?? "open"}`, "");

  if (d.contributors && d.contributors.length > 0) {
    lines.push(`## Participantes`, "");
    for (const p of d.contributors) lines.push(`- ${wl(p)}`);
    lines.push("");
  }

  if (d.relatedRepos && d.relatedRepos.length > 0) {
    lines.push(`## Repos afectados`, "");
    for (const repo of d.relatedRepos) lines.push(`- ${wl(repo)}`);
    lines.push("");
  }

  if (d.tags && d.tags.length > 0) {
    lines.push(`## Tags`, "");
    lines.push(d.tags.map(t => `#${t}`).join("  "));
    lines.push("");
  }

  if (d.linkedCommits && d.linkedCommits.length > 0) {
    lines.push(`## Implementación`, "");
    for (const link of d.linkedCommits) {
      const pct = Math.round(link.confidenceScore * 100);
      lines.push(
        `- \`${link.commitHash.substring(0, 8)}\` — ${wl(link.commitAuthor)} en ${wl(link.repo)}` +
          ` (${link.linkType}, ${pct}% confianza, ${link.createdBy})`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildMOC(
  people: string[],
  repos: string[],
  decisions: ContextEntry[],
  mermaidDiagram: string,
  stats: { nodes: number; edges: number }
): string {
  const now = new Date().toISOString().substring(0, 16).replace("T", " ");

  const lines: string[] = [
    "# 🗺️ Mapa del Equipo",
    "",
    `> Generado por obsidian-vault-mcp · ${now}`,
    `> Nodos: **${stats.nodes}** · Conexiones: **${stats.edges}**`,
    "",
    "---",
    "",
    "## 👥 Personas",
    "",
    ...people.map(p => `- ${wl(p)}`),
    "",
    "## 📁 Repositorios",
    "",
    ...repos.map(r => `- ${wl(r)}`),
    "",
  ];

  const recentDecisions = decisions
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 15);

  if (recentDecisions.length > 0) {
    lines.push("## 🧠 Decisiones", "");
    for (const d of recentDecisions) {
      lines.push(
        `- ${statusEmoji(d.status)} ${wlAlias(slugify(d.title), d.title)} · ${d.timestamp.substring(0, 10)}`
      );
    }
    lines.push("");
  }

  lines.push(
    "## 🔗 Knowledge Graph",
    "",
    "```mermaid",
    mermaidDiagram,
    "```",
    ""
  );

  return lines.join("\n");
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function syncGraphToObsidian(
  input: z.infer<typeof SyncGraphToObsidianInputSchema>
): Promise<string> {
  const vault = VAULTS[input.vault];
  if (!vault) throw new Error(`Vault no encontrado: ${input.vault}`);

  const vaultPath = vault.path;
  const allEntries = memoryClient.getAll();
  const created: string[] = [];

  // ── Collect all people ───────────────────────────────────────────────────

  const knownPeople = new Map<
    string,
    { name: string; role?: string; email?: string }
  >();

  for (const m of TEAM_MEMBERS) {
    knownPeople.set(m.name, { name: m.name, role: m.role, email: m.email });
  }
  for (const entry of allEntries) {
    for (const c of entry.contributors ?? []) {
      if (!knownPeople.has(c)) knownPeople.set(c, { name: c });
    }
    for (const link of entry.linkedCommits ?? []) {
      if (!knownPeople.has(link.commitAuthor)) {
        knownPeople.set(link.commitAuthor, { name: link.commitAuthor });
      }
    }
  }

  // ── Collect all repos ────────────────────────────────────────────────────

  const allRepos = new Set<string>(Object.keys(REPOS));
  for (const entry of allEntries) {
    for (const repo of entry.relatedRepos ?? []) allRepos.add(repo);
    for (const link of entry.linkedCommits ?? []) allRepos.add(link.repo);
  }

  // ── Personas/ ────────────────────────────────────────────────────────────

  const personasDir = join(vaultPath, "Personas");
  ensureDir(personasDir);

  for (const [name, person] of knownPeople) {
    const content = buildPersonNote(name, person.role, person.email, allEntries);
    writeNote(join(personasDir, `${name}.md`), content);
    created.push(`Personas/${name}.md`);
  }

  // ── Repos/ ───────────────────────────────────────────────────────────────

  const reposDir = join(vaultPath, "Repos");
  ensureDir(reposDir);

  for (const repoName of allRepos) {
    const content = buildRepoNote(repoName, allEntries);
    writeNote(join(reposDir, `${repoName}.md`), content);
    created.push(`Repos/${repoName}.md`);
  }

  // ── Decisiones/ ──────────────────────────────────────────────────────────

  const decisionesDir = join(vaultPath, "Decisiones");
  ensureDir(decisionesDir);

  const decisions = allEntries.filter(e => e.type === "decision");
  for (const d of decisions) {
    const slug = slugify(d.title);
    const content = buildDecisionNote(d);
    writeNote(join(decisionesDir, `${slug}.md`), content);
    created.push(`Decisiones/${slug}.md`);
  }

  // ── _Mapa del Equipo.md (MOC) ────────────────────────────────────────────

  const graph = await buildKnowledgeGraph();
  const mermaidDiagram = toMermaid(graph, {
    nodeTypes: ["decision", "meeting", "person", "repo"],
    minImportance: 0,
  });

  const moc = buildMOC(
    Array.from(knownPeople.keys()),
    Array.from(allRepos),
    decisions,
    mermaidDiagram,
    { nodes: graph.nodes.size, edges: graph.edges.length }
  );

  writeNote(join(vaultPath, "_Mapa del Equipo.md"), moc);
  created.push("_Mapa del Equipo.md");

  return JSON.stringify(
    {
      success: true,
      vault: input.vault,
      vaultPath,
      notesCreated: created.length,
      breakdown: {
        personas: Array.from(knownPeople.keys()).length,
        repos: allRepos.size,
        decisions: decisions.length,
        moc: 1,
      },
      created,
      nextStep:
        "Abrí el vault en Obsidian → Graph View (Ctrl+G) para ver las conexiones. " +
        "Buscá '_Mapa del Equipo' para el overview con el diagrama Mermaid.",
    },
    null,
    2
  );
}
