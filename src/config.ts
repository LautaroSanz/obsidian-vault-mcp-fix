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
// Paths default cross-platform usando homedir(). Override via env var VAULTS_<NAME>_PATH.
export const VAULTS: Record<string, VaultConfig> = {
  FACULTAD: {
    name: "FACULTAD",
    path: process.env.VAULTS_FACULTAD_PATH || join(HOME, "Documentos", "FACULTAD"),
    hasGit: true,
  },
  DATAOILERS: {
    name: "DATAOILERS",
    path: process.env.VAULTS_DATAOILERS_PATH || join(HOME, "Documentos", "DATAOILERS"),
    hasGit: false,
  },
  PROYECTOS: {
    name: "PROYECTOS",
    path: process.env.VAULTS_PROYECTOS_PATH || join(HOME, "Documentos", "PROYECTOS"),
    hasGit: false,
  },
};

// Repos from Data Oilers organization (local paths)
// Override via env var REPO_<NAME_UPPER_SNAKE>_PATH.
export let REPOS: Record<string, RepoConfig> = {
  "enterprise-ai-platform": {
    name: "enterprise-ai-platform",
    url: "https://github.com/data-oilers/enterprise-ai-platform",
    localPath:
      process.env.REPO_ENTERPRISE_AI_PLATFORM_PATH ||
      join(HOME, "repos", "data-oilers", "enterprise-ai-platform"),
    org: "data-oilers",
  },
  "poc-macro-riesgo": {
    name: "poc-macro-riesgo",
    url: "https://github.com/data-oilers/poc-macro-riesgo",
    localPath:
      process.env.REPO_POC_MACRO_RIESGO_PATH ||
      join(HOME, "repos", "data-oilers", "poc-macro-riesgo"),
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

// Maps git commit author names → canonical team member name
export const AUTHOR_ALIASES: Record<string, string> = {
  "emisorato1": "Emiliano",
  "Emiliano Vicente Sorato": "Emiliano",
  "Franco Manca": "Franco",
  "Lautaro Sanz": "Lautaro",
  "ËEG": "Emanuel",
  "eeg": "Emanuel",
  "Eneas Emanuel Gallo": "Emanuel",
  "agustin2505": "Agustin",
  "Gaston Garcia Juri": "Gaston",
  "Gaston": "Gaston",
  "branko007": "Branco",
  "Eliezer": "Eliezer",
};
