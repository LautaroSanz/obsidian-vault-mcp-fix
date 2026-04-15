import { KnowledgeGraph, GraphNode } from "./types.js";

// ─── BFS Reachability ─────────────────────────────────────────────────────────

export interface ReachableEntry {
  node: GraphNode;
  depth: number;
}

/**
 * BFS from startId, traversing edges in both directions (undirected).
 * Returns a Map of all reachable node IDs → { node, depth }.
 * The start node itself is included at depth 0.
 */
export function bfsReachable(
  graph: KnowledgeGraph,
  startId: string,
  maxDepth: number
): Map<string, ReachableEntry> {
  const visited = new Map<string, ReachableEntry>();
  const startNode = graph.nodes.get(startId);
  if (!startNode) return visited;

  visited.set(startId, { node: startNode, depth: 0 });
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const neighborIds = graph.edges
      .filter(e => e.source === id || e.target === id)
      .map(e => (e.source === id ? e.target : e.source));

    for (const neighborId of neighborIds) {
      if (!visited.has(neighborId)) {
        const neighborNode = graph.nodes.get(neighborId);
        if (neighborNode) {
          visited.set(neighborId, { node: neighborNode, depth: depth + 1 });
          queue.push({ id: neighborId, depth: depth + 1 });
        }
      }
    }
  }

  return visited;
}

// ─── Shortest Path (BFS) ──────────────────────────────────────────────────────

/**
 * Returns the shortest path between two nodes as an ordered array of GraphNodes,
 * or null if no path exists. Traverses edges in both directions.
 */
export function bfsShortestPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string
): GraphNode[] | null {
  if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) return null;
  if (fromId === toId) return [graph.nodes.get(fromId)!];

  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    const neighborIds = graph.edges
      .filter(e => e.source === id || e.target === id)
      .map(e => (e.source === id ? e.target : e.source));

    for (const neighborId of neighborIds) {
      if (neighborId === toId) {
        const fullPath = [...path, toId];
        return fullPath.map(nid => graph.nodes.get(nid)!).filter(Boolean);
      }
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, path: [...path, neighborId] });
      }
    }
  }

  return null;
}

/**
 * Among the intermediate nodes in a path, find those with above-average degree —
 * they're the "bottlenecks" whose removal would disconnect the path.
 */
export function findBottlenecks(graph: KnowledgeGraph, path: GraphNode[]): GraphNode[] {
  if (path.length <= 2) return [];

  const middle = path.slice(1, -1);
  const degreeCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    degreeCounts.set(edge.source, (degreeCounts.get(edge.source) ?? 0) + 1);
    degreeCounts.set(edge.target, (degreeCounts.get(edge.target) ?? 0) + 1);
  }

  const degrees = Array.from(degreeCounts.values());
  const avgDegree = degrees.reduce((a, b) => a + b, 0) / Math.max(degrees.length, 1);

  return middle.filter(n => (degreeCounts.get(n.id) ?? 0) > avgDegree);
}

// ─── Community Detection ──────────────────────────────────────────────────────

export interface Community {
  id: string;
  topic: string;
  nodes: GraphNode[];
  density: number;
  bridges: GraphNode[];
}

/**
 * Simplified community detection:
 * - Topic seeds: decisions/meetings connected via "tagged_with" edges are grouped by topic.
 * - Repo seeds: decisions/meetings that affect the same repo are grouped.
 * - Uncategorised remainder forms its own group if large enough.
 *
 * Returns communities sorted by size descending.
 */
export function detectCommunities(
  graph: KnowledgeGraph,
  minSize: number = 2
): Community[] {
  // seed → set of member node IDs
  const groups = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    if (edge.type === "tagged_with") {
      if (!groups.has(edge.target)) groups.set(edge.target, new Set());
      groups.get(edge.target)!.add(edge.source);
    }
    if (
      edge.type === "affects" &&
      graph.nodes.get(edge.target)?.type === "repo"
    ) {
      if (!groups.has(edge.target)) groups.set(edge.target, new Set());
      groups.get(edge.target)!.add(edge.source);
    }
  }

  // Uncategorized decisions/meetings
  const allGrouped = new Set<string>(
    Array.from(groups.values()).flatMap(s => Array.from(s))
  );
  const ungrouped = new Set<string>();
  for (const [id, node] of graph.nodes) {
    if (
      (node.type === "decision" || node.type === "meeting") &&
      !allGrouped.has(id)
    ) {
      ungrouped.add(id);
    }
  }
  if (ungrouped.size >= minSize) {
    groups.set("uncategorized", ungrouped);
  }

  // Build Community objects
  const communities: Community[] = [];

  for (const [centerId, memberIds] of groups) {
    if (memberIds.size < minSize) continue;

    const centerNode = graph.nodes.get(centerId);
    const topic = centerNode?.label ?? centerId;
    const nodes = Array.from(memberIds)
      .map(id => graph.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);

    // Density: internal edges / max possible undirected edges
    const memberSet = new Set(memberIds);
    const internalEdges = graph.edges.filter(
      e => memberSet.has(e.source) && memberSet.has(e.target)
    ).length;
    const maxPossible = (nodes.length * (nodes.length - 1)) / 2;
    const density =
      maxPossible > 0
        ? Math.round((internalEdges / maxPossible) * 100) / 100
        : 0;

    // Bridges: members with at least one edge going outside this community
    const bridges = nodes.filter(n =>
      graph.edges.some(e => {
        const other = e.source === n.id ? e.target : e.target === n.id ? e.source : null;
        return other !== null && !memberSet.has(other);
      })
    );

    communities.push({ id: centerId, topic, nodes, density, bridges });
  }

  return communities.sort((a, b) => b.nodes.length - a.nodes.length);
}
