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

// Team Members (8 people)
export const TEAM_MEMBERS: TeamMember[] = [
  { name: "Alice", email: process.env.TEAM_ALICE_EMAIL || "alice@company.com", role: "Backend Lead" },
  { name: "Bob", email: process.env.TEAM_BOB_EMAIL || "bob@company.com", role: "Frontend" },
  { name: "Charlie", email: process.env.TEAM_CHARLIE_EMAIL || "charlie@company.com", role: "DevOps" },
  { name: "Diana", email: process.env.TEAM_DIANA_EMAIL || "diana@company.com", role: "QA Lead" },
  { name: "Eve", email: process.env.TEAM_EVE_EMAIL || "eve@company.com", role: "Backend" },
  { name: "Frank", email: process.env.TEAM_FRANK_EMAIL || "frank@company.com", role: "Frontend" },
  { name: "Grace", email: process.env.TEAM_GRACE_EMAIL || "grace@company.com", role: "Data Engineer" },
  { name: "Henry", email: process.env.TEAM_HENRY_EMAIL || "henry@company.com", role: "Security" },
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
