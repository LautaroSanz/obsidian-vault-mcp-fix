import { homedir } from "node:os";
import { join } from "node:path";

export interface VaultConfig {
  name: string;
  path: string;
  hasGit: boolean;
}

export interface TeamMember {
  name: string;
  email: string;
  role?: string;
}

export interface GitConfig {
  mode: "github-org";
  org: string;
  githubToken?: string;
  cacheDir: string;
  refreshInterval: number;
}

export interface RepoConfig {
  name: string;
  url: string;
  localPath: string;
  org: string;
}

const HOME = homedir();

// Git Configuration - GitHub Organization Mode
export const GIT_CONFIG: GitConfig = {
  mode: "github-org",
  org: process.env.GITHUB_ORG || "your-org-name",
  githubToken: process.env.GITHUB_TOKEN,
  cacheDir: join(HOME, ".claude", "git-cache"),
  refreshInterval: 3600000, // 1 hour
};

// Team Members - DataOilers
export const TEAM_MEMBERS: TeamMember[] = [
  { name: "Emiliano", email: process.env.TEAM_Emiliano_EMAIL || "emiliano@dataoilers.com", role: "" },
  { name: "Emanuel",  email: process.env.TEAM_Emanuel_EMAIL  || "emanuel@dataoilers.com",  role: "" },
  { name: "Agustin",  email: process.env.TEAM_Agustin_EMAIL  || "agustin@dataoilers.com",  role: "" },
  { name: "Lautaro",  email: process.env.TEAM_Lautaro_EMAIL  || "lautaro@dataoilers.com",  role: "" },
  { name: "Franco",   email: process.env.TEAM_Franco_EMAIL   || "franco@dataoilers.com",   role: "" },
  { name: "Branco",   email: process.env.TEAM_Branco_EMAIL   || "branco@dataoilers.com",   role: "" },
  { name: "Gaston",   email: process.env.TEAM_Gaston_EMAIL   || "gaston@dataoilers.com",   role: "" },
  { name: "Eliezer",  email: process.env.TEAM_Eliezer_EMAIL  || "matias.rivero@dataoilers.com", role: "" },
];

// Obsidian Vaults
export const VAULTS: Record<string, VaultConfig> = {
  FACULTAD: {
    name: "FACULTAD",
    path: "C:\\Users\\riper\\Documentos\\FACULTAD",
    hasGit: true,
  },
  DATAOILERS: {
    name: "DATAOILERS",
    path: "C:\\Users\\riper\\Documentos\\DATAOILERS",
    hasGit: false,
  },
  PROYECTOS: {
    name: "PROYECTOS",
    path: "C:\\Users\\riper\\Documentos\\PROYECTOS",
    hasGit: false,
  },
};

// Repos from Data Oilers organization (local paths)
export let REPOS: Record<string, RepoConfig> = {
  "enterprise-ai-platform": {
    name: "enterprise-ai-platform",
    url: "https://github.com/data-oilers/enterprise-ai-platform",
    localPath: "D:\\repos\\data-oilers\\enterprise-ai-platform",
    org: "data-oilers",
  },
  "poc-macro-riesgo": {
    name: "poc-macro-riesgo",
    url: "https://github.com/data-oilers/poc-macro-riesgo",
    localPath: "D:\\repos\\data-oilers\\poc-macro-riesgo",
    org: "data-oilers",
  },
};

// Subject tags for categorization
export const SUBJECT_TAGS: Record<string, string> = {
  "Inteligencia Artificial": "inteligencia-artificial",
  "Seguridad en los Sistemas": "seguridad-sistemas",
  "Sistemas de Gestion": "sistemas-gestion",
  "Vision por computadora": "vision-computadora",
  "Proyecto Final": "proyecto-final",
  "Reconectar internet": "reconectar-internet",
  "Data-Oilers": "data-oilers",
  "ARCA-SDK": "arca-sdk",
};

export function getSubjectTag(subject: string): string {
  return SUBJECT_TAGS[subject] ?? subject.toLowerCase().replace(/\s+/g, "-");
}

export function setRepos(repos: Record<string, RepoConfig>): void {
  REPOS = repos;
}

export function getTeamMemberByName(name: string): TeamMember | undefined {
  return TEAM_MEMBERS.find(member => member.name === name);
}
