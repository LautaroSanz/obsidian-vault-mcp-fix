export type NodeType =
  | "decision"
  | "meeting"
  | "action-item"
  | "commit"
  | "person"
  | "repo"
  | "topic";

export type EdgeType =
  | "implements"
  | "depends_on"
  | "participates"
  | "owns"
  | "affects"
  | "related_to"
  | "triggered_by"
  | "authored"
  | "changes"
  | "tagged_with"
  | "part_of";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata: Record<string, unknown>;
  /** Degree centrality normalized 0-1, computed after all edges are added */
  importance: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  /** Confidence/importance of this edge (0-1) */
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  createdAt: string;
  lastUpdated: string;
}
