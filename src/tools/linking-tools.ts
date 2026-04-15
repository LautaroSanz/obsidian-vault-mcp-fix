import { z } from "zod";
import { REPOS } from "../config.js";
import { memoryClient, CommitDecisionLink, ContextEntry } from "../memory.js";
import { createGitUtils } from "../git/git-utils.js";
import {
  scoreCommitDecisionMatch,
  rankCommits,
  ScoringContext,
  CommitCandidate,
} from "../linking/scoring.js";

// --- Schemas ---

export const AutoLinkCommitsInputSchema = z.object({
  decisionId: z.string().describe("ID de la entrada en Memory que contiene la decisión"),
  repos: z
    .array(z.string())
    .optional()
    .describe("Repos donde buscar commits (default: todos los repos relacionados)"),
  timeframeAfterDecision: z
    .number()
    .optional()
    .default(30)
    .describe("Días después de la decisión para buscar commits (default: 30)"),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Umbral mínimo de confianza para crear link (default: 0.7)"),
});

export const LinkCommitToDecisionInputSchema = z.object({
  repo: z.string().describe("Nombre del repositorio"),
  commitHash: z.string().describe("Hash del commit"),
  decisionId: z.string().describe("ID de la decisión en Memory"),
  linkType: z
    .enum(["implements", "fixes", "refactors", "related"])
    .optional()
    .default("implements")
    .describe("Tipo de relación"),
});

export const LinkActionItemToCommitInputSchema = z.object({
  actionItemId: z.string().describe("ID del action item en Memory"),
  commitHash: z.string().describe("Hash del commit"),
  repo: z.string().describe("Nombre del repositorio"),
});

export const GetDecisionTimelineInputSchema = z.object({
  decisionId: z.string().describe("ID de la entrada en Memory"),
});

export const GetDecisionImpactInputSchema = z.object({
  decisionId: z.string().describe("ID de la entrada en Memory"),
});

export const MarkDecisionCompleteInputSchema = z.object({
  decisionId: z.string().describe("ID de la entrada en Memory"),
  completionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Fecha de completado (YYYY-MM-DD). Default: hoy"),
});

// --- Handlers ---

export async function autoLinkCommits(
  input: z.infer<typeof AutoLinkCommitsInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.decisionId);
  if (!entry) {
    throw new Error(`Entrada no encontrada en Memory: ${input.decisionId}`);
  }

  const scoringContext: ScoringContext = {
    decisionText: entry.title + " " + entry.summary,
    decisionDate: new Date(entry.timestamp),
    decisionParticipants: entry.contributors ?? [],
    decisionRelatedRepos: entry.relatedRepos,
  };

  // Determinar repos a buscar
  const reposToSearch =
    input.repos ??
    entry.relatedRepos ??
    Object.keys(REPOS);

  const allScored: Array<{ scored: ReturnType<typeof rankCommits>[0]; repo: string }> = [];

  for (const repoName of reposToSearch) {
    const repoConfig = REPOS[repoName];
    if (!repoConfig) continue;

    let commits: CommitCandidate[];
    try {
      const git = createGitUtils(repoConfig.localPath);
      const raw = git.getRecentCommits(100);
      commits = raw.map(c => ({
        hash: c.hash,
        author: c.author,
        date: c.date,
        message: c.message,
        repo: repoName,
        filesChanged: c.filesChanged,
      }));
    } catch {
      continue;
    }

    const scored = commits.map(c =>
      scoreCommitDecisionMatch(scoringContext, c, input.timeframeAfterDecision)
    );
    const ranked = rankCommits(scored, input.confidenceThreshold);
    ranked.forEach(s => allScored.push({ scored: s, repo: repoName }));
  }

  // Crear los links en Memory
  const created: CommitDecisionLink[] = [];
  for (const { scored } of allScored) {
    const link: CommitDecisionLink = {
      commitHash: scored.commit.hash,
      commitAuthor: scored.commit.author,
      commitDate: scored.commit.date.toISOString(),
      decisionId: input.decisionId,
      decisionText: entry.title,
      repo: scored.commit.repo,
      confidenceScore: scored.score,
      linkType: "implements",
      createdAt: new Date().toISOString(),
      createdBy: "auto",
    };
    await memoryClient.addCommitLink(input.decisionId, link);
    created.push(link);
  }

  return JSON.stringify(
    {
      decisionId: input.decisionId,
      decisionTitle: entry.title,
      reposSearched: reposToSearch,
      linksCreated: created.length,
      links: created.map(l => ({
        repo: l.repo,
        hash: l.commitHash.substring(0, 8),
        author: l.commitAuthor,
        confidence: l.confidenceScore,
        linkType: l.linkType,
      })),
    },
    null,
    2
  );
}

export async function linkCommitToDecision(
  input: z.infer<typeof LinkCommitToDecisionInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.decisionId);
  if (!entry) {
    throw new Error(`Entrada no encontrada en Memory: ${input.decisionId}`);
  }

  const repoConfig = REPOS[input.repo];
  if (!repoConfig) {
    throw new Error(`Repositorio no encontrado: ${input.repo}`);
  }

  const git = createGitUtils(repoConfig.localPath);
  const commit = git.getCommitInfo(input.commitHash);

  const link: CommitDecisionLink = {
    commitHash: commit.hash,
    commitAuthor: commit.author,
    commitDate: commit.date.toISOString(),
    decisionId: input.decisionId,
    decisionText: entry.title,
    repo: input.repo,
    confidenceScore: 1.0,
    linkType: input.linkType,
    createdAt: new Date().toISOString(),
    createdBy: "manual",
  };

  await memoryClient.addCommitLink(input.decisionId, link);

  return JSON.stringify(
    {
      success: true,
      decisionId: input.decisionId,
      decisionTitle: entry.title,
      commit: {
        hash: commit.hash.substring(0, 8),
        author: commit.author,
        message: commit.message,
        repo: input.repo,
      },
      linkType: input.linkType,
      createdBy: "manual",
    },
    null,
    2
  );
}

export async function linkActionItemToCommit(
  input: z.infer<typeof LinkActionItemToCommitInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.actionItemId);
  if (!entry) {
    throw new Error(`Action item no encontrado en Memory: ${input.actionItemId}`);
  }

  const repoConfig = REPOS[input.repo];
  if (!repoConfig) {
    throw new Error(`Repositorio no encontrado: ${input.repo}`);
  }

  const git = createGitUtils(repoConfig.localPath);
  const commit = git.getCommitInfo(input.commitHash);

  const relatedLinks = entry.relatedLinks ?? [];
  const newLink = `${input.repo}@${commit.hash.substring(0, 8)}`;
  if (!relatedLinks.includes(newLink)) {
    await memoryClient.update(input.actionItemId, {
      relatedLinks: [...relatedLinks, newLink],
      status: "in-progress",
    });
  }

  return JSON.stringify(
    {
      success: true,
      actionItemId: input.actionItemId,
      commit: {
        hash: commit.hash.substring(0, 8),
        author: commit.author,
        message: commit.message,
        repo: input.repo,
      },
    },
    null,
    2
  );
}

export async function getDecisionTimeline(
  input: z.infer<typeof GetDecisionTimelineInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.decisionId);
  if (!entry) {
    throw new Error(`Entrada no encontrada en Memory: ${input.decisionId}`);
  }

  const events: Array<{
    date: string;
    type: string;
    label: string;
    meta: Record<string, unknown>;
  }> = [];

  // Evento: la decisión misma
  events.push({
    date: entry.timestamp,
    type: "decision",
    label: entry.title,
    meta: {
      participants: entry.contributors,
      summary: entry.summary,
      repos: entry.relatedRepos,
    },
  });

  // Eventos: action items del mismo meeting
  const meetingId = entry.relatedLinks?.find(l => l.startsWith("meeting:"))?.slice("meeting:".length);
  if (meetingId) {
    const allActionItems = await memoryClient.query("", { type: "action-item" } as any);
    const relatedAIs = allActionItems.entries.filter(e =>
      e.relatedLinks?.includes(`meeting:${meetingId}`)
    );
    for (const ai of relatedAIs) {
      let meta: Record<string, string> = {};
      try { meta = JSON.parse(ai.summary); } catch { /* not JSON */ }
      events.push({
        date: ai.timestamp,
        type: "action-item",
        label: `[${ai.status ?? "pending"}] ${ai.contributors?.[0] ?? meta.owner ?? "?"}: ${ai.title}`,
        meta: {
          id: ai.id,
          owner: ai.contributors?.[0] ?? meta.owner,
          dueDate: meta.dueDate,
          status: ai.status,
        },
      });
    }
  }

  // Eventos: commits linkeados
  for (const link of entry.linkedCommits ?? []) {
    events.push({
      date: link.commitDate,
      type: "commit",
      label: `[${link.linkType}] ${link.commitAuthor}: ${link.commitHash.substring(0, 8)}`,
      meta: {
        repo: link.repo,
        hash: link.commitHash,
        author: link.commitAuthor,
        confidence: link.confidenceScore,
        linkType: link.linkType,
        createdBy: link.createdBy,
      },
    });
  }

  // Ordenar cronológicamente
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isComplete = entry.status === "completed";
  const linkedCommitsCount = entry.linkedCommits?.length ?? 0;

  return JSON.stringify(
    {
      decisionId: input.decisionId,
      title: entry.title,
      status: entry.status ?? "open",
      isComplete,
      linkedCommits: linkedCommitsCount,
      timeline: events,
    },
    null,
    2
  );
}

export async function getDecisionImpact(
  input: z.infer<typeof GetDecisionImpactInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.decisionId);
  if (!entry) {
    throw new Error(`Entrada no encontrada en Memory: ${input.decisionId}`);
  }

  const links = entry.linkedCommits ?? [];
  const reposSet = new Set<string>();
  const authorsSet = new Set<string>();
  const filesSet = new Set<string>();

  for (const link of links) {
    reposSet.add(link.repo);
    authorsSet.add(link.commitAuthor);

    const repoConfig = REPOS[link.repo];
    if (repoConfig) {
      try {
        const git = createGitUtils(repoConfig.localPath);
        const commit = git.getCommitInfo(link.commitHash);
        commit.filesChanged.forEach(f => filesSet.add(f));
      } catch {
        // repo no disponible localmente
      }
    }
  }

  return JSON.stringify(
    {
      decisionId: input.decisionId,
      title: entry.title,
      impact: {
        commitsLinked: links.length,
        reposImpacted: Array.from(reposSet),
        authorsInvolved: Array.from(authorsSet),
        filesChanged: filesSet.size,
        autoLinks: links.filter(l => l.createdBy === "auto").length,
        manualLinks: links.filter(l => l.createdBy === "manual").length,
      },
    },
    null,
    2
  );
}

export async function markDecisionComplete(
  input: z.infer<typeof MarkDecisionCompleteInputSchema>
): Promise<string> {
  const entry = await memoryClient.getById(input.decisionId);
  if (!entry) {
    throw new Error(`Entrada no encontrada en Memory: ${input.decisionId}`);
  }

  const completionDate = input.completionDate
    ? new Date(input.completionDate).toISOString()
    : new Date().toISOString();

  await memoryClient.update(input.decisionId, {
    status: "completed",
    relatedLinks: [
      ...(entry.relatedLinks ?? []),
      `completed:${completionDate}`,
    ],
  });

  return JSON.stringify(
    {
      success: true,
      decisionId: input.decisionId,
      title: entry.title,
      completedAt: completionDate,
    },
    null,
    2
  );
}
