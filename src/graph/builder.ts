import { memoryClient } from "../memory.js";
import { REPOS, TEAM_MEMBERS } from "../config.js";
import { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType } from "./types.js";

/**
 * Build a KnowledgeGraph from all entries currently in Memory.
 * Uses two passes to avoid forward-reference issues:
 *   Pass 1 — create all nodes
 *   Pass 2 — create all edges (both endpoints guaranteed to exist)
 */
export async function buildKnowledgeGraph(): Promise<KnowledgeGraph> {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let edgeCounter = 0;

  const ensureNode = (
    id: string,
    type: NodeType,
    label: string,
    metadata: Record<string, unknown> = {}
  ): void => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, type, label, metadata, importance: 0 });
    }
  };

  const ensureEdge = (
    source: string,
    target: string,
    type: EdgeType,
    weight = 1.0,
    metadata?: Record<string, unknown>
  ): void => {
    if (!nodes.has(source) || !nodes.has(target)) return;
    const isDup = edges.some(
      e => e.source === source && e.target === target && e.type === type
    );
    if (!isDup) {
      edges.push({
        id: `e-${++edgeCounter}`,
        source,
        target,
        type,
        weight,
        metadata,
      });
    }
  };

  // ─── Static nodes ─────────────────────────────────────────────────────────

  for (const member of TEAM_MEMBERS) {
    ensureNode(`person-${member.name}`, "person", member.name, {
      email: member.email,
      role: member.role ?? "",
    });
  }

  for (const name of Object.keys(REPOS)) {
    ensureNode(`repo-${name}`, "repo", name, {});
  }

  // ─── Pass 1: nodes from Memory entries ────────────────────────────────────

  const allEntries = memoryClient.getAll();

  for (const entry of allEntries) {
    if (entry.type === "meeting") {
      ensureNode(entry.id, "meeting", entry.title, {
        timestamp: entry.timestamp,
        status: entry.status,
      });

    } else if (entry.type === "decision") {
      ensureNode(entry.id, "decision", entry.title, {
        timestamp: entry.timestamp,
        status: entry.status,
      });

      // Commit nodes that implement this decision
      for (const link of entry.linkedCommits ?? []) {
        const shortHash = link.commitHash.substring(0, 8);
        const commitId = `commit-${link.repo}-${shortHash}`;
        ensureNode(commitId, "commit", `${shortHash} (${link.repo})`, {
          hash: link.commitHash,
          author: link.commitAuthor,
          repo: link.repo,
          date: link.commitDate,
          confidence: link.confidenceScore,
        });
        ensureNode(`person-${link.commitAuthor}`, "person", link.commitAuthor, {});
        ensureNode(`repo-${link.repo}`, "repo", link.repo, {});
      }

      // Topic nodes
      for (const tag of entry.tags ?? []) {
        ensureNode(`topic-${tag}`, "topic", tag, {});
      }

      // Extra repo nodes
      for (const repo of entry.relatedRepos ?? []) {
        ensureNode(`repo-${repo}`, "repo", repo, {});
      }

      // Participant nodes
      for (const p of entry.contributors ?? []) {
        ensureNode(`person-${p}`, "person", p, {});
      }

    } else if (entry.type === "action-item") {
      ensureNode(entry.id, "action-item", entry.title, {
        timestamp: entry.timestamp,
        status: entry.status,
      });

      for (const p of entry.contributors ?? []) {
        ensureNode(`person-${p}`, "person", p, {});
      }
    }
  }

  // ─── Pass 2: edges from Memory relationships ───────────────────────────────

  for (const entry of allEntries) {
    if (entry.type === "meeting") {
      // Person → Meeting (participates)
      for (const p of entry.contributors ?? []) {
        ensureEdge(`person-${p}`, entry.id, "participates");
      }
      // Meeting → Repo (affects)
      for (const repo of entry.relatedRepos ?? []) {
        ensureEdge(entry.id, `repo-${repo}`, "affects");
      }

    } else if (entry.type === "decision") {
      // Decision → Meeting (triggered_by)
      const meetingRef = entry.relatedLinks
        ?.find(l => l.startsWith("meeting:"))
        ?.slice("meeting:".length);
      if (meetingRef) {
        ensureEdge(entry.id, meetingRef, "triggered_by");
      }

      // Person → Decision (participates)
      for (const p of entry.contributors ?? []) {
        ensureEdge(`person-${p}`, entry.id, "participates");
      }

      // Decision → Repo (affects)
      for (const repo of entry.relatedRepos ?? []) {
        ensureEdge(entry.id, `repo-${repo}`, "affects");
      }

      // Decision → Topic (tagged_with)
      for (const tag of entry.tags ?? []) {
        ensureEdge(entry.id, `topic-${tag}`, "tagged_with");
      }

      // Decision → Commit (implements) + Commit → Person/Repo
      for (const link of entry.linkedCommits ?? []) {
        const shortHash = link.commitHash.substring(0, 8);
        const commitId = `commit-${link.repo}-${shortHash}`;
        ensureEdge(entry.id, commitId, "implements", link.confidenceScore);
        ensureEdge(`person-${link.commitAuthor}`, commitId, "authored");
        ensureEdge(commitId, `repo-${link.repo}`, "changes");
      }

    } else if (entry.type === "action-item") {
      // Person → ActionItem (owns)
      const owner = entry.contributors?.[0];
      if (owner) {
        ensureEdge(`person-${owner}`, entry.id, "owns");
      }

      // ActionItem → Meeting (part_of)
      const meetingRef = entry.relatedLinks
        ?.find(l => l.startsWith("meeting:"))
        ?.slice("meeting:".length);
      if (meetingRef) {
        ensureEdge(entry.id, meetingRef, "part_of");
      }

      // ActionItem → Commit (triggered_by) — from relatedLinks "repo@hash" format
      for (const link of entry.relatedLinks ?? []) {
        if (link.startsWith("meeting:") || link.startsWith("completed:")) continue;
        const [repo, hash] = link.split("@");
        if (repo && hash) {
          const commitId = `commit-${repo}-${hash}`;
          if (nodes.has(commitId)) {
            ensureEdge(entry.id, commitId, "triggered_by");
          }
        }
      }
    }
  }

  // ─── Compute importance (degree centrality) ────────────────────────────────

  const degreeCounts = new Map<string, number>();
  for (const edge of edges) {
    degreeCounts.set(edge.source, (degreeCounts.get(edge.source) ?? 0) + 1);
    degreeCounts.set(edge.target, (degreeCounts.get(edge.target) ?? 0) + 1);
  }

  const maxDegree = Math.max(...Array.from(degreeCounts.values()), 1);
  for (const node of nodes.values()) {
    const degree = degreeCounts.get(node.id) ?? 0;
    node.importance = Math.round((degree / maxDegree) * 100) / 100;
  }

  return {
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}
