import { z } from "zod";
import { buildKnowledgeGraph } from "../graph/builder.js";
import {
  bfsReachable,
  bfsShortestPath,
  findBottlenecks,
  detectCommunities,
} from "../graph/algorithms.js";
import { toMermaid, toJSON, GraphFilters } from "../graph/visualizer.js";
import { NodeType } from "../graph/types.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const NODE_TYPE_ENUM = z.enum([
  "decision",
  "meeting",
  "action-item",
  "commit",
  "person",
  "repo",
  "topic",
]);

export const GetKnowledgeGraphInputSchema = z.object({
  timeframe: z
    .enum(["week", "month", "all"])
    .optional()
    .default("all")
    .describe("Período de tiempo para filtrar entradas"),
  nodeTypes: z
    .array(NODE_TYPE_ENUM)
    .optional()
    .describe("Tipos de nodo a incluir (default: todos)"),
  minImportance: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Importancia mínima del nodo (0-1, basado en centralidad de grado)"),
  repos: z
    .array(z.string())
    .optional()
    .describe("Mostrar solo nodos relacionados a estos repos"),
  people: z
    .array(z.string())
    .optional()
    .describe("Mostrar solo nodos relacionados a estas personas"),
  format: z
    .enum(["json", "mermaid"])
    .optional()
    .default("mermaid")
    .describe("Formato de salida"),
});

export const AnalyzeNodeImpactInputSchema = z.object({
  nodeId: z
    .string()
    .describe(
      "ID o label del nodo (ej: 'decision-xxx', 'person-Alice', 'repo-backend'). Se acepta búsqueda parcial."
    ),
  depth: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(3)
    .describe("Profundidad máxima del BFS (default: 3)"),
});

export const FindCommunitiesInputSchema = z.object({
  minSize: z
    .number()
    .int()
    .min(2)
    .optional()
    .default(2)
    .describe("Tamaño mínimo de una comunidad (default: 2)"),
});

export const GetNodePathInputSchema = z.object({
  from: z
    .string()
    .describe("ID o label del nodo origen (acepta búsqueda parcial)"),
  to: z
    .string()
    .describe("ID o label del nodo destino (acepta búsqueda parcial)"),
});

export const GetPersonNetworkInputSchema = z.object({
  person: z.string().describe("Nombre de la persona (ej: 'Alice')"),
  depth: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .default(2)
    .describe("Profundidad de exploración (default: 2)"),
});

export const GetRepoDecisionHistoryInputSchema = z.object({
  repo: z.string().describe("Nombre del repositorio"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a node reference (exact ID or partial label/ID match). */
function resolveNode(graph: ReturnType<typeof buildKnowledgeGraph> extends Promise<infer T> ? T : never, ref: string) {
  if (graph.nodes.has(ref)) return graph.nodes.get(ref)!;
  const lower = ref.toLowerCase();
  return Array.from(graph.nodes.values()).find(
    n =>
      n.label.toLowerCase().includes(lower) ||
      n.id.toLowerCase().includes(lower)
  );
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getKnowledgeGraph(
  input: z.infer<typeof GetKnowledgeGraphInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();

  const filters: GraphFilters = {
    nodeTypes: input.nodeTypes as NodeType[] | undefined,
    minImportance: input.minImportance,
    repos: input.repos,
    people: input.people,
  };

  if (input.format === "json") {
    return JSON.stringify(toJSON(graph), null, 2);
  }

  const mermaid = toMermaid(graph, filters);
  const stats = `\`\`\`\nNodos: ${graph.nodes.size}  |  Edges: ${graph.edges.length}\n\`\`\`\n\n`;
  return stats + "```mermaid\n" + mermaid + "\n```";
}

export async function analyzeNodeImpact(
  input: z.infer<typeof AnalyzeNodeImpactInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();

  const source = resolveNode(graph, input.nodeId);
  if (!source) {
    const available = Array.from(graph.nodes.values())
      .slice(0, 15)
      .map(n => `${n.id} (${n.type}: ${n.label})`)
      .join("\n  ");
    throw new Error(
      `Nodo no encontrado: "${input.nodeId}"\n\nNodos disponibles (primeros 15):\n  ${available}`
    );
  }

  const reachable = bfsReachable(graph, source.id, input.depth);

  // Group by depth (excluding the source itself)
  const byDepth: Record<number, Array<{ id: string; type: string; label: string }>> = {};
  for (const [id, { node, depth }] of reachable) {
    if (id === source.id) continue;
    if (!byDepth[depth]) byDepth[depth] = [];
    byDepth[depth].push({ id: node.id, type: node.type, label: node.label });
  }

  const allReachable = Array.from(reachable.values()).filter(
    ({ node }) => node.id !== source.id
  );

  const affectedRepos = allReachable
    .filter(({ node }) => node.type === "repo")
    .map(({ node }) => node.label);
  const affectedPeople = allReachable
    .filter(({ node }) => node.type === "person")
    .map(({ node }) => node.label);
  const estimatedImpact =
    Math.round(
      Math.min((allReachable.length / Math.max(graph.nodes.size, 1)) * 5, 1) * 100
    ) / 100;

  return JSON.stringify(
    {
      sourceNode: {
        id: source.id,
        type: source.type,
        label: source.label,
        importance: source.importance,
      },
      reachableByDepth: byDepth,
      totalReachable: allReachable.length,
      affectedRepos,
      affectedPeople,
      estimatedImpact,
      graphStats: { totalNodes: graph.nodes.size, totalEdges: graph.edges.length },
    },
    null,
    2
  );
}

export async function findCommunities(
  input: z.infer<typeof FindCommunitiesInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();
  const communities = detectCommunities(graph, input.minSize);

  return JSON.stringify(
    {
      totalCommunities: communities.length,
      communities: communities.map(c => ({
        id: c.id,
        topic: c.topic,
        size: c.nodes.length,
        density: c.density,
        nodes: c.nodes.map(n => ({ id: n.id, type: n.type, label: n.label })),
        bridges: c.bridges.map(n => ({ id: n.id, type: n.type, label: n.label })),
      })),
    },
    null,
    2
  );
}

export async function getNodePath(
  input: z.infer<typeof GetNodePathInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();

  const fromNode = resolveNode(graph, input.from);
  const toNode = resolveNode(graph, input.to);

  if (!fromNode) throw new Error(`Nodo origen no encontrado: "${input.from}"`);
  if (!toNode) throw new Error(`Nodo destino no encontrado: "${input.to}"`);

  const path = bfsShortestPath(graph, fromNode.id, toNode.id);

  if (!path) {
    return JSON.stringify(
      {
        from: { id: fromNode.id, label: fromNode.label },
        to: { id: toNode.id, label: toNode.label },
        connected: false,
        message: "No existe camino entre estos dos nodos en el grafo actual",
      },
      null,
      2
    );
  }

  const bottlenecks = findBottlenecks(graph, path);

  return JSON.stringify(
    {
      from: { id: fromNode.id, type: fromNode.type, label: fromNode.label },
      to: { id: toNode.id, type: toNode.type, label: toNode.label },
      connected: true,
      distance: path.length - 1,
      path: path.map(n => ({ id: n.id, type: n.type, label: n.label })),
      bottlenecks: bottlenecks.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        importance: n.importance,
      })),
    },
    null,
    2
  );
}

export async function getPersonNetwork(
  input: z.infer<typeof GetPersonNetworkInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();

  // Resolve person (by name or partial match)
  const personId = `person-${input.person}`;
  const personNode =
    graph.nodes.get(personId) ??
    Array.from(graph.nodes.values()).find(
      n =>
        n.type === "person" &&
        n.label.toLowerCase().includes(input.person.toLowerCase())
    );

  if (!personNode) {
    const people = Array.from(graph.nodes.values())
      .filter(n => n.type === "person")
      .map(n => n.label);
    throw new Error(
      `Persona no encontrada: "${input.person}". Personas en el grafo: ${people.join(", ")}`
    );
  }

  const reachable = bfsReachable(graph, personNode.id, input.depth);

  const meetings = Array.from(reachable.values())
    .filter(({ node }) => node.type === "meeting")
    .map(({ node }) => node.label);

  const decisions = Array.from(reachable.values())
    .filter(({ node }) => node.type === "decision")
    .map(({ node }) => node.label);

  const repos = Array.from(reachable.values())
    .filter(({ node }) => node.type === "repo")
    .map(({ node }) => node.label);

  const commitsCount = Array.from(reachable.values()).filter(
    ({ node }) => node.type === "commit"
  ).length;

  // Action items owned by this person
  const ownedIds = graph.edges
    .filter(e => e.source === personNode.id && e.type === "owns")
    .map(e => e.target);
  const ownedNodes = ownedIds
    .map(id => graph.nodes.get(id))
    .filter(Boolean) as typeof personNode[];

  const pendingCount = ownedNodes.filter(n => n.metadata?.status === "pending").length;
  const completedCount = ownedNodes.filter(n => n.metadata?.status === "completed").length;

  // Collaborators: other persons reachable within depth
  const collaborators = Array.from(reachable.values())
    .filter(({ node, depth }) => node.type === "person" && depth > 0)
    .map(({ node }) => node.label);

  return JSON.stringify(
    {
      person: personNode.label,
      importance: personNode.importance,
      meetings: meetings.length,
      decisions: decisions.length,
      repos,
      commits: commitsCount,
      actionItems: {
        total: ownedNodes.length,
        pending: pendingCount,
        completed: completedCount,
        inProgress: ownedNodes.length - pendingCount - completedCount,
      },
      collaborators,
      totalReachable: reachable.size - 1,
    },
    null,
    2
  );
}

export async function getRepoDecisionHistory(
  input: z.infer<typeof GetRepoDecisionHistoryInputSchema>
): Promise<string> {
  const graph = await buildKnowledgeGraph();

  const repoId = `repo-${input.repo}`;
  if (!graph.nodes.has(repoId)) {
    const repos = Array.from(graph.nodes.values())
      .filter(n => n.type === "repo")
      .map(n => n.label);
    throw new Error(
      `Repo no encontrado: "${input.repo}". Repos en el grafo: ${repos.join(", ")}`
    );
  }

  // Decisions that affect this repo
  const decisionIds = graph.edges
    .filter(e => e.target === repoId && e.type === "affects")
    .map(e => e.source)
    .filter(id => graph.nodes.get(id)?.type === "decision");

  const history = decisionIds.map(id => {
    const node = graph.nodes.get(id)!;

    // Commits from this decision that touch this repo
    const commitNodes = graph.edges
      .filter(e => e.source === id && e.type === "implements")
      .map(e => graph.nodes.get(e.target))
      .filter((n): n is typeof node => n !== undefined && n.metadata?.repo === input.repo);

    const authors = [
      ...new Set(commitNodes.map(c => c.metadata?.author as string).filter(Boolean)),
    ];

    return {
      decisionId: id,
      decision: node.label,
      date: (node.metadata?.timestamp as string)?.substring(0, 10) ?? "unknown",
      status: (node.metadata?.status as string) ?? "open",
      importance: node.importance,
      commitsImplementing: commitNodes.length,
      authors,
    };
  });

  history.sort((a, b) => a.date.localeCompare(b.date));

  return JSON.stringify(
    {
      repo: input.repo,
      totalDecisions: history.length,
      history,
    },
    null,
    2
  );
}
