import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createNote } from "./tools/create-note.js";
import { searchNotes } from "./tools/search-notes.js";
import { listSubjects } from "./tools/list-subjects.js";
import { readNote } from "./tools/read-note.js";
import { appendToNote } from "./tools/append-to-note.js";
import { updateNote } from "./tools/update-note.js";
import {
  getRepoContext,
  getFileHistory,
  getCommitInfo,
  getRepoStats,
  listRepos,
  GetRepoContextInputSchema,
  GetFileHistoryInputSchema,
  GetCommitInfoInputSchema,
  GetRepoStatsInputSchema,
} from "./tools/git-tools.js";
import { createMeetingNote, CreateMeetingNoteInputSchema } from "./tools/meeting-tools.js";
import {
  queryMemory,
  getTeamContext,
  listActionItems,
  QueryMemoryInputSchema,
  GetTeamContextInputSchema,
  ListActionItemsInputSchema,
} from "./tools/memory-tools.js";
import {
  autoLinkCommits,
  linkCommitToDecision,
  linkActionItemToCommit,
  getDecisionTimeline,
  getDecisionImpact,
  markDecisionComplete,
  AutoLinkCommitsInputSchema,
  LinkCommitToDecisionInputSchema,
  LinkActionItemToCommitInputSchema,
  GetDecisionTimelineInputSchema,
  GetDecisionImpactInputSchema,
  MarkDecisionCompleteInputSchema,
} from "./tools/linking-tools.js";
import { advancedSearch, AdvancedSearchInputSchema } from "./tools/search-tools.js";
import {
  getKnowledgeGraph,
  analyzeNodeImpact,
  findCommunities,
  getNodePath,
  getPersonNetwork,
  getRepoDecisionHistory,
  GetKnowledgeGraphInputSchema,
  AnalyzeNodeImpactInputSchema,
  FindCommunitiesInputSchema,
  GetNodePathInputSchema,
  GetPersonNetworkInputSchema,
  GetRepoDecisionHistoryInputSchema,
} from "./tools/graph-tools.js";
import {
  syncGraphToObsidian,
  SyncGraphToObsidianInputSchema,
} from "./tools/obsidian-sync-tools.js";
import { repoDiscovery } from "./git/repo-discovery.js";

const server = new McpServer({
  name: "obsidian-vault-team-context",
  version: "3.0.0",
});

// Initialize repo discovery
await repoDiscovery.updateReposCache();

const vaultEnum = z.enum(["FACULTAD", "DATAOILERS"]);
const noteTypeEnum = z.enum(["class-summary", "concept", "exercise", "research", "general"]);

server.tool(
  "create_note",
  "Crear una nueva nota en un vault de Obsidian con template estructurado",
  {
    vault: vaultEnum.describe("Vault destino"),
    title: z.string().describe("Titulo de la nota"),
    content: z.string().describe("Contenido principal de la nota"),
    subject: z.string().optional().describe("Materia/carpeta (requerido para FACULTAD)"),
    type: noteTypeEnum.default("general").describe("Tipo de template: class-summary, concept, exercise, research, general"),
    key_concepts: z.string().optional().describe("Conceptos clave (para class-summary)"),
    definition: z.string().optional().describe("Definicion (para concept)"),
    examples: z.string().optional().describe("Ejemplos (para concept)"),
    problem: z.string().optional().describe("Enunciado del problema (para exercise)"),
    solution: z.string().optional().describe("Resolucion (para exercise)"),
    notes: z.string().optional().describe("Notas adicionales (para exercise)"),
    context: z.string().optional().describe("Contexto (para research)"),
    references: z.string().optional().describe("Referencias (para research)"),
  },
  async (params) => {
    const result = await createNote(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "search_notes",
  "Buscar notas por contenido en un vault de Obsidian",
  {
    vault: vaultEnum.describe("Vault donde buscar"),
    query: z.string().describe("Texto a buscar"),
  },
  async (params) => {
    const result = await searchNotes(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "list_subjects",
  "Listar materias/carpetas de un vault de Obsidian",
  {
    vault: vaultEnum.describe("Vault a listar"),
  },
  async (params) => {
    const result = await listSubjects(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "read_note",
  "Leer el contenido de una nota existente en un vault de Obsidian",
  {
    vault: vaultEnum.describe("Vault de la nota"),
    path: z.string().describe("Ruta relativa de la nota (ej: 'Inteligencia Artificial/6-4-26.md')"),
  },
  async (params) => {
    const result = await readNote(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "append_to_note",
  "Agregar contenido a una nota existente, opcionalmente bajo un heading especifico",
  {
    vault: vaultEnum.describe("Vault de la nota"),
    path: z.string().describe("Ruta relativa de la nota"),
    content: z.string().describe("Contenido a agregar"),
    section: z.string().optional().describe("Heading donde insertar (ej: '## Conceptos clave'). Si no se especifica, agrega al final."),
  },
  async (params) => {
    const result = await appendToNote(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "update_note",
  "Reescribir el contenido completo de una nota existente. Util para mejorar, reestructurar o agregar links entre conceptos",
  {
    vault: vaultEnum.describe("Vault de la nota"),
    path: z.string().describe("Ruta relativa de la nota"),
    content: z.string().describe("Nuevo contenido completo de la nota (reemplaza todo el contenido anterior)"),
  },
  async (params) => {
    const result = await updateNote(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Git Tools
server.tool(
  "get_repo_context",
  "Obtener contexto reciente de un repositorio (commits, estadísticas, rama actual)",
  GetRepoContextInputSchema.shape,
  async (params: any) => {
    const result = await getRepoContext(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_file_history",
  "Obtener histórico de commits de un archivo específico",
  GetFileHistoryInputSchema.shape,
  async (params: any) => {
    const result = await getFileHistory(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_commit_info",
  "Obtener información detallada de un commit específico",
  GetCommitInfoInputSchema.shape,
  async (params: any) => {
    const result = await getCommitInfo(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_repo_stats",
  "Obtener estadísticas de commits por autor",
  GetRepoStatsInputSchema.shape,
  async (params: any) => {
    const result = await getRepoStats(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "list_repos",
  "Listar todos los repositorios siendo trackeados",
  {},
  async () => {
    const result = await listRepos();
    return { content: [{ type: "text", text: result }] };
  },
);

// Meeting Tools
server.tool(
  "create_meeting_note",
  "Crear una nota de reunión estructurada que se guarda automáticamente en Memory",
  CreateMeetingNoteInputSchema.shape,
  async (params: any) => {
    const result = await createMeetingNote(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Memory Tools
server.tool(
  "query_memory",
  "Buscar en Memory por decisiones, reuniones, items de acción",
  QueryMemoryInputSchema.shape,
  async (params: any) => {
    const result = await queryMemory(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_team_context",
  "Obtener snapshot del contexto del equipo (últimas semana/mes)",
  GetTeamContextInputSchema.shape,
  async (params: any) => {
    const result = await getTeamContext(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "list_action_items",
  "Listar items de acción pendientes",
  ListActionItemsInputSchema.shape,
  async (params: any) => {
    const result = await listActionItems(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Linking Tools (Phase 2)
server.tool(
  "auto_link_commits",
  "Detectar automáticamente commits que implementan una decisión usando heurísticas de scoring",
  AutoLinkCommitsInputSchema.shape,
  async (params: any) => {
    const result = await autoLinkCommits(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "link_commit_to_decision",
  "Linkear manualmente un commit a una decisión",
  LinkCommitToDecisionInputSchema.shape,
  async (params: any) => {
    const result = await linkCommitToDecision(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "link_action_item_to_commit",
  "Asociar un action item con el commit que lo implementa",
  LinkActionItemToCommitInputSchema.shape,
  async (params: any) => {
    const result = await linkActionItemToCommit(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_decision_timeline",
  "Ver la línea de tiempo de una decisión: reunión → action items → commits",
  GetDecisionTimelineInputSchema.shape,
  async (params: any) => {
    const result = await getDecisionTimeline(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_decision_impact",
  "Ver el impacto de una decisión: commits, repos, archivos y autores afectados",
  GetDecisionImpactInputSchema.shape,
  async (params: any) => {
    const result = await getDecisionImpact(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "mark_decision_complete",
  "Marcar una decisión como implementada/completada",
  MarkDecisionCompleteInputSchema.shape,
  async (params: any) => {
    const result = await markDecisionComplete(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Search Tools (Phase 2)
server.tool(
  "advanced_search",
  "Búsqueda avanzada en Memory con filtros múltiples y ranking por relevancia",
  AdvancedSearchInputSchema.shape,
  async (params: any) => {
    const result = await advancedSearch(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Knowledge Graph Tools (Phase 3)
server.tool(
  "get_knowledge_graph",
  "Construir y visualizar el knowledge graph del equipo (decisiones, commits, personas, repos). Soporta formato Mermaid y JSON.",
  GetKnowledgeGraphInputSchema.shape,
  async (params: any) => {
    const result = await getKnowledgeGraph(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "analyze_node_impact",
  "Analizar el impacto de un nodo del grafo: cuántos nodos alcanza, repos y personas afectadas",
  AnalyzeNodeImpactInputSchema.shape,
  async (params: any) => {
    const result = await analyzeNodeImpact(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "find_communities",
  "Detectar comunidades/clusters naturales de nodos en el knowledge graph",
  FindCommunitiesInputSchema.shape,
  async (params: any) => {
    const result = await findCommunities(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_node_path",
  "Encontrar el camino más corto entre dos nodos del grafo (shortest path BFS)",
  GetNodePathInputSchema.shape,
  async (params: any) => {
    const result = await getNodePath(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_person_network",
  "Ver el network de una persona: reuniones, decisiones, action items, colaboradores y repos",
  GetPersonNetworkInputSchema.shape,
  async (params: any) => {
    const result = await getPersonNetwork(params);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_repo_decision_history",
  "Ver el historial de decisiones que afectaron un repositorio específico",
  GetRepoDecisionHistoryInputSchema.shape,
  async (params: any) => {
    const result = await getRepoDecisionHistory(params);
    return { content: [{ type: "text", text: result }] };
  },
);

// Obsidian Sync (Phase 3+)
server.tool(
  "sync_graph_to_obsidian",
  "Sincronizar el knowledge graph al vault de Obsidian: crea notas para Personas/, Repos/, Decisiones/ con wikilinks entre ellas, y una nota MOC '_Mapa del Equipo.md' con diagrama Mermaid. Después de correr, abrir Graph View en Obsidian (Ctrl+G) para ver el cerebro visual.",
  SyncGraphToObsidianInputSchema.shape,
  async (params: any) => {
    const result = await syncGraphToObsidian(params);
    return { content: [{ type: "text", text: result }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
