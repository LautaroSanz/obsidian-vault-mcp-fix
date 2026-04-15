import { z } from "zod";
import { memoryClient, ContextEntry, QueryFilters } from "../memory.js";
import { extractKeywords } from "../linking/scoring.js";

export const AdvancedSearchInputSchema = z.object({
  query: z.string().describe("Texto libre a buscar"),
  types: z
    .array(z.enum(["meeting", "decision", "context", "action-item"]))
    .optional()
    .describe("Filtrar por tipos de entrada"),
  authors: z
    .array(z.string())
    .optional()
    .describe("Filtrar por autores/participantes"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Fecha de inicio (YYYY-MM-DD)"),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Fecha de fin (YYYY-MM-DD)"),
  repos: z.array(z.string()).optional().describe("Filtrar por repositorios"),
  tags: z.array(z.string()).optional().describe("Filtrar por tags"),
  status: z
    .enum(["open", "in-progress", "completed"])
    .optional()
    .describe("Filtrar por estado"),
  linkedToCommit: z
    .boolean()
    .optional()
    .describe("true: solo con commits linkeados / false: solo sin commits"),
  confidenceMin: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Confianza mínima en los links (0-1)"),
  sort: z
    .enum(["date", "relevance", "confidence"])
    .optional()
    .default("relevance")
    .describe("Criterio de ordenamiento"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Máximo de resultados"),
});

export type AdvancedSearchInput = z.infer<typeof AdvancedSearchInputSchema>;

interface ScoredEntry {
  entry: ContextEntry;
  relevanceScore: number;
}

function computeRelevanceScore(entry: ContextEntry, queryKeywords: string[]): number {
  if (queryKeywords.length === 0) return 1;

  const text = (entry.title + " " + entry.summary + " " + (entry.tags ?? []).join(" ")).toLowerCase();
  const entryWords = text.split(/\s+/);

  // TF score: proporción de keywords del query que aparecen en el texto
  const matchCount = queryKeywords.filter(kw => text.includes(kw)).length;
  const tfScore = matchCount / queryKeywords.length;

  // Recency boost: entradas de los últimos 7 días reciben +50%
  const daysOld =
    (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = daysOld <= 7 ? 1.5 : 1.0;

  // Confidence boost: si tiene commits linkeados con alta confianza
  const maxConfidence = Math.max(
    0,
    ...(entry.linkedCommits?.map(lc => lc.confidenceScore) ?? [0])
  );
  const confidenceBoost = 1 + maxConfidence * 0.2;

  return tfScore * recencyBoost * confidenceBoost;
}

function sortEntries(
  scored: ScoredEntry[],
  sort: "date" | "relevance" | "confidence"
): ScoredEntry[] {
  if (sort === "date") {
    return scored.sort(
      (a, b) =>
        new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime()
    );
  }
  if (sort === "confidence") {
    return scored.sort((a, b) => {
      const confA = Math.max(0, ...(a.entry.linkedCommits?.map(l => l.confidenceScore) ?? [0]));
      const confB = Math.max(0, ...(b.entry.linkedCommits?.map(l => l.confidenceScore) ?? [0]));
      return confB - confA;
    });
  }
  // relevance (default)
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function advancedSearch(input: AdvancedSearchInput): Promise<string> {
  const queryKeywords = extractKeywords(input.query);

  // Ejecutar múltiples queries si hay múltiples types, o uno solo
  const typesToSearch = input.types && input.types.length > 0 ? input.types : [undefined];

  const allEntries = new Map<string, ContextEntry>();

  for (const type of typesToSearch) {
    const filters: QueryFilters = {
      type,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
      repos: input.repos,
      tags: input.tags,
      status: input.status,
      linkedToCommit: input.linkedToCommit,
      confidenceMin: input.confidenceMin,
    };

    // Para multi-author: hacer un query por autor y union
    const authors = input.authors && input.authors.length > 0 ? input.authors : [undefined];
    for (const author of authors) {
      const result = await memoryClient.query(input.query, { ...filters, author });
      result.entries.forEach(e => allEntries.set(e.id, e));
    }
  }

  const entries = Array.from(allEntries.values());

  // Scoring de relevancia
  const scored: ScoredEntry[] = entries.map(entry => ({
    entry,
    relevanceScore: computeRelevanceScore(entry, queryKeywords),
  }));

  // Ordenar y limitar
  const sorted = sortEntries(scored, input.sort);
  const limited = sorted.slice(0, input.limit);

  return JSON.stringify(
    {
      totalFound: entries.length,
      returned: limited.length,
      sort: input.sort,
      results: limited.map(({ entry, relevanceScore }) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        summary: entry.summary,
        timestamp: entry.timestamp,
        status: entry.status,
        contributors: entry.contributors,
        relatedRepos: entry.relatedRepos,
        tags: entry.tags,
        linkedCommits: entry.linkedCommits?.length ?? 0,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
      })),
    },
    null,
    2
  );
}
