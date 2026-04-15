import { CommitInfo } from "../git/types.js";

// Palabras vacías en español e inglés que no aportan significado
const STOPWORDS = new Set([
  // español
  "usar", "con", "para", "una", "un", "los", "las", "del", "que", "por",
  "en", "de", "la", "el", "y", "a", "se", "su", "al", "lo", "como",
  "mas", "pero", "sus", "le", "ya", "si", "porque", "esta", "son",
  // inglés
  "use", "using", "add", "adding", "update", "updating", "fix", "fixing",
  "the", "a", "an", "and", "or", "for", "in", "on", "at", "to", "of",
  "with", "from", "by", "as", "into", "that", "this", "it", "is", "was",
  "are", "be", "been", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "not", "no",
]);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

export function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter(x => setB.has(x));
}

export interface ScoringContext {
  decisionText: string;
  decisionDate: Date;
  decisionParticipants: string[];
  decisionRelatedRepos?: string[];
}

export interface CommitCandidate {
  hash: string;
  author: string;
  date: Date;
  message: string;
  repo: string;
  filesChanged: string[];
}

export interface ScoredCommit {
  commit: CommitCandidate;
  score: number;
  breakdown: {
    semantic: number;
    temporal: number;
    repo: number;
    participant: number;
  };
  sharedKeywords: string[];
}

export function scoreCommitDecisionMatch(
  context: ScoringContext,
  commit: CommitCandidate,
  timeframeAfterDays: number = 30
): ScoredCommit {
  const decisionKeywords = extractKeywords(context.decisionText);
  const commitKeywords = extractKeywords(commit.message);
  const shared = intersection(decisionKeywords, commitKeywords);

  // Semántica (40%): proporción de keywords de la decisión que aparecen en el commit
  const semanticScore =
    decisionKeywords.length > 0
      ? (shared.length / decisionKeywords.length) * 0.4
      : 0;

  // Temporal (30%): commit dentro del timeframe, más cercano = mejor score
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAfter = (commit.date.getTime() - context.decisionDate.getTime()) / msPerDay;
  let temporalScore = 0;
  if (daysAfter > 0 && daysAfter <= timeframeAfterDays) {
    temporalScore = 0.3 * (1 - daysAfter / timeframeAfterDays);
  }

  // Contexto de repo (20%): el commit está en un repo relacionado con la decisión
  let repoScore = 0;
  if (context.decisionRelatedRepos && context.decisionRelatedRepos.length > 0) {
    if (context.decisionRelatedRepos.includes(commit.repo)) {
      repoScore = 0.2;
    }
  } else {
    // Si no hay repos especificados, asumir relevante
    repoScore = 0.1;
  }

  // Participantes (10%): el autor del commit participó en la reunión
  const participantScore = context.decisionParticipants
    .map(p => p.toLowerCase())
    .includes(commit.author.toLowerCase())
    ? 0.1
    : 0;

  const total = Math.min(semanticScore + temporalScore + repoScore + participantScore, 1.0);

  return {
    commit,
    score: Math.round(total * 100) / 100,
    breakdown: {
      semantic: Math.round(semanticScore * 100) / 100,
      temporal: Math.round(temporalScore * 100) / 100,
      repo: Math.round(repoScore * 100) / 100,
      participant: Math.round(participantScore * 100) / 100,
    },
    sharedKeywords: shared,
  };
}

export function rankCommits(
  scored: ScoredCommit[],
  threshold: number = 0.7
): ScoredCommit[] {
  return scored
    .filter(s => s.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
