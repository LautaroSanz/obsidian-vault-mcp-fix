# Setup MCP Obsidian Team Context

## Requisitos Previos

- Node.js 18+
- npm
- Git
- Claude Code
- Plugin claude-mem instalado

## Instalación

1. **Clonar/descargar el proyecto**

```bash
cd obsidian-vault-mcp
npm install
npm run build
```

2. **Configurar variables de entorno**

Copiar `.env.example` a `.env` y completar:

```bash
cp .env.example .env
```

Editar `.env` con:
- `GITHUB_TOKEN`: Token de GitHub personal (para descubrimiento de repos)
- `GITHUB_ORG`: Nombre de la organización en GitHub
- `TEAM_*_EMAIL`: Emails de los 8 miembros del equipo

3. **Configurar vaults de Obsidian**

Los paths de vaults tienen default cross-platform (`~/Documentos/<NAME>`). Si tus vaults viven ahí, **no necesitás cambiar nada**.

Si están en otra ruta, override con env vars en `.env`:

```bash
# Linux
VAULTS_FACULTAD_PATH=/home/juan/mis-notas/FACULTAD

# macOS
VAULTS_FACULTAD_PATH=/Users/juan/Documents/FACULTAD

# Windows (usar forward slash o doble backslash)
VAULTS_FACULTAD_PATH=C:/Users/Juan/Obsidian/FACULTAD
```

Alternativa: editar `src/config.ts` directamente (requiere `npm run build` después):

```typescript
export const VAULTS: Record<string, VaultConfig> = {
  FACULTAD: {
    path: "/Users/tu-user/path/to/FACULTAD",
    hasGit: true,
  },
  // ...
};
```

4. **Registrar en Claude Code**

En Claude Code settings → MCP Servers → Agregar:

```
Name: obsidian-vault-mcp
Command: node
Arguments: /absolute/path/to/obsidian-vault-mcp/dist/index.js
```

5. **Verificar instalación**

```bash
npm run build
node dist/index.js
```

Deberías ver: `MCP server connected to stdio transport`

## Configuración Detallada

### Descubrimiento de Repos (GitHub Org)

El sistema usa GitHub API para descubrir automáticamente repos de tu organización.

Requiere:
- Token GitHub válido (con permiso `repo:read`)
- Nombre correcto de la organización

Sin GITHUB_TOKEN, solo funcionan herramientas de Obsidian.

### Team Members

Los 8 miembros se configuran en `src/config.ts`:

```typescript
export const TEAM_MEMBERS: TeamMember[] = [
  { name: "Alice", email: "...", role: "Backend Lead" },
  // ...
];
```

Los nombres se usan en:
- `create_meeting_note` (field: participants)
- `list_action_items` (field: owner)

### Repos Locales

Los repos se buscan en:
- GitHub org (si GITHUB_TOKEN está configurado)
- Rutas locales clonadas en el filesystem

Para repos locales, actualizar `src/config.ts`:

```typescript
export const REPOS: Record<string, RepoConfig> = {
  "auth-service": {
    name: "auth-service",
    url: "https://github.com/org/auth-service",
    localPath: "/path/to/auth-service",
    org: "your-org",
  },
  // ...
};
```

## Herramientas Disponibles

### Git Tools

- `get_repo_context(repo, limit?)` - Contexto reciente del repo
- `get_file_history(repo, filePath, limit?)` - Histórico de un archivo
- `get_commit_info(repo, hash)` - Detalles de un commit
- `get_repo_stats(repo, timeframe?)` - Estadísticas de commits
- `list_repos()` - Listar todos los repos trackeados

### Meeting & Memory Tools

- `create_meeting_note(...)` - Crear nota de reunión + guardar a Memory
- `query_memory(query, filters?)` - Buscar en Memory
- `get_team_context(timeframe)` - Snapshot del equipo (semana/mes)
- `list_action_items(owner?, status?)` - Items de acción pendientes

### Obsidian Tools (heredadas)

- `create_note(vault, title, content, ...)` - Crear nota
- `read_note(vault, path)` - Leer nota
- `search_notes(vault, query)` - Buscar notas
- `append_to_note(vault, path, content, section?)` - Agregar a nota
- `update_note(vault, path, content)` - Actualizar nota
- `list_subjects(vault)` - Listar materias/carpetas

## Ejemplos de Uso

### Ejemplo 1: Ver actividad reciente de un repo

```
Tool: get_repo_context
Inputs:
  repo: "auth-service"
  limit: 20

Returns:
{
  name: "auth-service",
  currentBranch: "main",
  recentCommits: [...],
  stats: {
    commitsThisMonth: 47,
    activeAuthors: ["Alice", "Charlie"],
    commitsByAuthor: { Alice: 23, Charlie: 18, Bob: 6 }
  }
}
```

### Ejemplo 2: Crear nota de reunión

```
Tool: create_meeting_note
Inputs:
  vault: "FACULTAD"
  date: "2026-04-15"
  title: "Auth System Decision"
  participants: ["Alice", "Bob"]
  decisions: ["Use OAuth2 with PKCE", "HTTP-only secure cookies"]
  actionItems: [
    {
      task: "Implement OAuth2",
      owner: "Alice",
      dueDate: "2026-04-20"
    }
  ]
  summary: "Decidimos usar OAuth2..."
  relatedRepos: ["auth-service", "frontend"]

Returns:
{
  success: true,
  notePath: "Reuniones/2026-04-15-auth-system-decision.md",
  message: "Nota de reunión creada y guardada en Memory"
}
```

### Ejemplo 3: Buscar decisiones en Memory

```
Tool: query_memory
Inputs:
  query: "oauth auth decision"
  type: "meeting"
  from: "2026-03-15"
  to: "2026-04-15"

Returns:
{
  totalCount: 3,
  entries: [
    {
      id: "meeting-1713180600000",
      timestamp: "2026-04-15T...",
      type: "meeting",
      title: "Auth System Decision",
      summary: "Decidimos usar OAuth2...",
      contributors: ["Alice", "Bob"],
      relatedRepos: ["auth-service", "frontend"]
    }
  ]
}
```

### Ejemplo 4: Ver contexto del equipo

```
Tool: get_team_context
Inputs:
  timeframe: "month"

Returns:
{
  timeframe: "month",
  summary: "Actividad de equipo de los últimos 30 días",
  contributors: [
    { name: "Alice", commits: 34, activity: "34 eventos registrados" },
    { name: "Charlie", commits: 28, activity: "28 eventos registrados" }
  ],
  recentDecisions: [...],
  pendingActionItems: [...],
  activeRepos: ["auth-service", "frontend", "backend"]
}
```

## Troubleshooting

**Error: "Repositorio no encontrado"**
- Verificar que el repo existe en GitHub org
- Verificar GITHUB_TOKEN y GITHUB_ORG están configurados
- Verificar localPath existe en filesystem

**Error: "Participantes inválidos"**
- Verificar nombres en create_meeting_note coinciden con TEAM_MEMBERS
- Nombres son case-sensitive

**Memory no guarda datos**
- Verificar que claude-mem plugin está instalado
- Verificar que no hay errores en la consola
- Por ahora, Memory es in-memory (se pierde al reiniciar proceso)

**Git commands fallan**
- Verificar que los repos están clonados localmente
- Verificar permisos de lectura en el filesystem
- Verificar Git está instalado

## Próximos Pasos (Phase 2)

- Auto-linking de commits que implementan decisiones
- Integración real con claude-mem (persistencia)
- Búsqueda avanzada en Memory
- Visualización de knowledge graphs

## Development

```bash
npm run build
npm run start

# En otra terminal, conectar con Claude Code
```

---

Documentación completa: ver `specs/FASE-1-ESPECIFICACION.md`
