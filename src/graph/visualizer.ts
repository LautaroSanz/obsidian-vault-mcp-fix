import { KnowledgeGraph, GraphNode, NodeType } from "./types.js";

// ─── Mermaid shapes per node type ─────────────────────────────────────────────

const SHAPES: Record<NodeType, readonly [string, string]> = {
  decision:      ["[",  "]"],    // rectangle
  meeting:       ["([", "])"],   // pill/stadium
  "action-item": [">",  "]"],    // asymmetric flag
  commit:        ["{",  "}"],    // rhombus
  person:        ["((", "))"],   // circle
  repo:          ["[(", ")]"],   // cylinder
  topic:         ["{{", "}}"],   // hexagon
} as const;

const STYLE: Record<NodeType, string> = {
  decision:      "fill:#4CAF50,color:#fff,stroke:#388E3C",
  meeting:       "fill:#2196F3,color:#fff,stroke:#1565C0",
  "action-item": "fill:#FF9800,color:#fff,stroke:#E65100",
  commit:        "fill:#9E9E9E,color:#fff,stroke:#616161",
  person:        "fill:#E91E63,color:#fff,stroke:#880E4F",
  repo:          "fill:#9C27B0,color:#fff,stroke:#6A1B9A",
  topic:         "fill:#00BCD4,color:#000,stroke:#006064",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mermaidId(id: string): string {
  // Mermaid node IDs must be alphanumeric + underscore/hyphen
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function truncate(text: string, max = 28): string {
  return text.length > max ? text.substring(0, max - 1) + "…" : text;
}

// ─── Filter options ───────────────────────────────────────────────────────────

export interface GraphFilters {
  nodeTypes?: NodeType[];
  minImportance?: number;
  repos?: string[];
  people?: string[];
}

// ─── Mermaid export ───────────────────────────────────────────────────────────

export function toMermaid(graph: KnowledgeGraph, filters?: GraphFilters): string {
  // Select visible nodes
  let visibleNodes = Array.from(graph.nodes.values());

  if (filters?.nodeTypes && filters.nodeTypes.length > 0) {
    visibleNodes = visibleNodes.filter(n => filters.nodeTypes!.includes(n.type));
  }
  if (filters?.minImportance !== undefined) {
    visibleNodes = visibleNodes.filter(n => n.importance >= filters.minImportance!);
  }
  if (filters?.repos && filters.repos.length > 0) {
    const repoIds = new Set(filters.repos.map(r => `repo-${r}`));
    const connected = new Set(
      graph.edges
        .filter(e => repoIds.has(e.source) || repoIds.has(e.target))
        .flatMap(e => [e.source, e.target])
    );
    visibleNodes = visibleNodes.filter(n => repoIds.has(n.id) || connected.has(n.id));
  }
  if (filters?.people && filters.people.length > 0) {
    const personIds = new Set(filters.people.map(p => `person-${p}`));
    const connected = new Set(
      graph.edges
        .filter(e => personIds.has(e.source) || personIds.has(e.target))
        .flatMap(e => [e.source, e.target])
    );
    visibleNodes = visibleNodes.filter(n => personIds.has(n.id) || connected.has(n.id));
  }

  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = graph.edges.filter(
    e => visibleIds.has(e.source) && visibleIds.has(e.target)
  );

  const lines: string[] = ["graph LR"];

  // classDef per node type used
  const usedTypes = new Set(visibleNodes.map(n => n.type));
  for (const type of usedTypes) {
    const cssClass = type.replace("-", "_");
    lines.push(`  classDef ${cssClass} ${STYLE[type]}`);
  }
  lines.push("");

  // Node definitions
  for (const node of visibleNodes) {
    const safeId = mermaidId(node.id);
    const [open, close] = SHAPES[node.type];
    const label = truncate(node.label);
    lines.push(`  ${safeId}${open}"${label}"${close}`);
    lines.push(`  class ${safeId} ${node.type.replace("-", "_")}`);
  }
  lines.push("");

  // Edge definitions
  for (const edge of visibleEdges) {
    const src = mermaidId(edge.source);
    const tgt = mermaidId(edge.target);
    lines.push(`  ${src} -->|"${edge.type}"| ${tgt}`);
  }

  return lines.join("\n");
}

// ─── JSON export ──────────────────────────────────────────────────────────────

export function toJSON(graph: KnowledgeGraph): object {
  return {
    metadata: {
      created: graph.createdAt,
      lastUpdated: graph.lastUpdated,
      totalNodes: graph.nodes.size,
      totalEdges: graph.edges.length,
    },
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
  };
}
