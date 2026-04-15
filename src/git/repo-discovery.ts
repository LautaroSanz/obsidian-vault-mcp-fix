import { homedir } from "node:os";
import { join } from "node:path";
import { GIT_CONFIG, RepoConfig, setRepos, REPOS } from "../config.js";

export interface DiscoveredRepo {
  name: string;
  url: string;
  description?: string;
  localPath?: string;
}

export class RepoDiscovery {
  private githubToken?: string;
  private org: string;

  constructor() {
    this.org = GIT_CONFIG.org;
    this.githubToken = GIT_CONFIG.githubToken;
  }

  async discoverFromGitHubOrg(): Promise<DiscoveredRepo[]> {
    if (!this.githubToken) {
      console.warn(
        "No GITHUB_TOKEN provided. Cannot discover repos from GitHub org. Using manual config only."
      );
      return [];
    }

    try {
      // This would use @octokit/rest to list repos
      // For now, return empty - to be implemented when octokit is installed
      // const octokit = new Octokit({ auth: this.githubToken });
      // const { data } = await octokit.repos.listForOrg({ org: this.org });
      // return data.map(repo => ({
      //   name: repo.name,
      //   url: repo.clone_url,
      //   description: repo.description,
      // }));

      console.log(
        `Would discover repos from GitHub org: ${this.org} (requires @octokit/rest installation)`
      );
      return [];
    } catch (error: any) {
      console.error(`Failed to discover repos from GitHub org: ${error.message}`);
      return [];
    }
  }

  async discoverLocalRepos(): Promise<DiscoveredRepo[]> {
    // This would scan the filesystem for git repos
    // For now, return empty - to be implemented based on usage patterns
    return [];
  }

  async discoverAll(): Promise<RepoConfig[]> {
    const discovered: DiscoveredRepo[] = [];

    if (GIT_CONFIG.mode === "github-org") {
      const githubRepos = await this.discoverFromGitHubOrg();
      discovered.push(...githubRepos);
    }

    const localRepos = await this.discoverLocalRepos();
    discovered.push(...localRepos);

    return discovered.map(repo => ({
      name: repo.name,
      url: repo.url,
      localPath: repo.localPath || join(homedir(), "repos", repo.name),
      org: GIT_CONFIG.org,
    }));
  }

  async updateReposCache(): Promise<void> {
    const repos = await this.discoverAll();
    const repoMap: Record<string, RepoConfig> = {};

    repos.forEach(repo => {
      repoMap[repo.name] = repo;
    });

    // Merge discovered repos with existing configured repos (configured takes precedence)
    const mergedRepos = { ...repoMap, ...REPOS };

    setRepos(mergedRepos);
  }
}

export const repoDiscovery = new RepoDiscovery();
