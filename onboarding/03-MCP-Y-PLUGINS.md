# 03 — MCP Servers y Plugins

Los MCP (Model Context Protocol) servers son procesos que le dan a Claude herramientas custom: leer/escribir en Obsidian, interactuar con GitHub, manejar reuniones/decisiones del equipo, etc. Cada persona del equipo necesita instalarlos localmente.

## MCP servers que usamos

| Nombre | Obligatorio | Qué aporta |
|---|---|---|
| `obsidian-vault-mcp` | **Sí** | MCP custom del equipo. Combina: Obsidian (notas), Git (contexto de repos), Memory (reuniones/decisiones/action items), Linking (commits ↔ decisiones). |
| `github` (oficial) | Recomendado | Operaciones sobre PRs, issues, comentarios, branches — complementa al git tooling del MCP custom. |
| `playwright` | Opcional | Automatización de navegador. |
| `claude-mem` (plugin) | **Sí** | Memoria persistente entre sesiones de Claude. |

## 1. obsidian-vault-mcp (MCP del equipo)

Repo upstream: [`data-oilers/obsidian-vault-mcp`](https://github.com/data-oilers/obsidian-vault-mcp)

> [!info] Fuente canónica
> Los docs autoritativos viven en el repo. Este onboarding solo cubre lo que no está ahí (Linux/Mac, integración con nuestro flujo). Para detalles de cada tool y config: leer `QUICK-START.md`, `SETUP.md`, `CONFIGURACION-MCP.md`, `TOOLS.md`, `USAGE.md`, `EXAMPLES.md` del repo.

### Tools que expone (20+)

**Obsidian** (notas/vaults): `create_note`, `read_note`, `search_notes`, `append_to_note`, `update_note`, `list_subjects`.

**Git** (descubre repos vía GitHub org + lee contexto local): `get_repo_context`, `get_file_history`, `get_commit_info`, `get_repo_stats`, `list_repos`.

**Meeting & Memory**: `create_meeting_note` (nota estructurada + guarda en memory), `query_memory`, `get_team_context`, `list_action_items`.

**Linking & Advanced Search** (Phase 2): `auto_link_commits`, `link_commit_to_decision`, `link_action_item_to_commit`, `get_decision_timeline`, `get_decision_impact`, `mark_decision_complete`, `advanced_search`.

### Instalación

```bash
git clone https://github.com/data-oilers/obsidian-vault-mcp.git ~/obsidian-vault-mcp
cd ~/obsidian-vault-mcp
npm install
npm run build
```

> [!warning] Convención de path
> Clonalo **siempre en `~/obsidian-vault-mcp/`** para que el `.mcp.json` sea idéntico entre máquinas del equipo.

### Configuración

El MCP tiene config híbrida: **env vars + edición manual de `src/config.ts`**. Hasta que esto se refactorice upstream, hay que tocar TypeScript.

#### a. Variables de entorno (`.env`)

```bash
cp .env.example .env
```

Editar `.env` y completar:

```env
# GitHub org auto-discovery (opcional pero recomendado)
GITHUB_TOKEN=ghp_xxxxx          # scope: repo:read + org:read
GITHUB_ORG=data-oilers

# Tu email del equipo (el que ya está hardcoded en config.ts)
TEAM_LAUTARO_EMAIL=lautaro@dataoilers.com
# ...
```

Crear el token: https://github.com/settings/personal-access-tokens/new

#### b. `src/config.ts` — paths de vaults en tu máquina

Editar la sección `VAULTS` con las **rutas reales** a tus vaults locales:

##### Linux
```typescript
export const VAULTS: Record<string, VaultConfig> = {
  DATAOILERS: {
    name: "DATAOILERS",
    path: "/home/TU-USUARIO/Documentos/PROYECTOS/dataoilers-vault-org",
    hasGit: true,
  },
  // agregar más si tenés otras vaults
};
```

##### macOS
```typescript
path: "/Users/TU-USUARIO/Documentos/PROYECTOS/dataoilers-vault-org",
```

##### Windows
```typescript
path: "C:\\Users\\TU-USUARIO\\Documentos\\PROYECTOS\\dataoilers-vault-org",
// o con forward slashes:
path: "C:/Users/TU-USUARIO/Documentos/PROYECTOS/dataoilers-vault-org",
```

> [!note] ¿Por qué hay vaults `FACULTAD` y `PROYECTOS` hardcoded?
> Son legacy del MCP original (uso personal de un miembro). Si no los tenés, eliminalos del `VAULTS` y del enum de `src/index.ts`. No rompe nada.

#### c. Rebuild tras cambios

```bash
npm run build
```

### Registrar en Claude Code

En cada repo donde uses Claude, agregar `.mcp.json` en la raíz:

```json
{
  "mcpServers": {
    "obsidian-vault-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/home/TU-USUARIO/obsidian-vault-mcp/dist/index.js"]
    }
  }
}
```

Template en `templates/mcp.json` de este onboarding. **Este archivo se versiona** — todos del equipo lo usan. Por eso la convención de clonar siempre en `~/obsidian-vault-mcp/`.

La primera vez que abras Claude te va a preguntar si confiás en este MCP server — decir que sí.

### Verificación

```bash
cd ~/obsidian-vault-mcp
node dist/index.js
# debería imprimir "MCP server connected to stdio transport" — Ctrl+C para salir
```

Dentro de Claude, en un repo con `.mcp.json`:

```
/mcp
```

Debería listar `obsidian-vault-mcp: connected`. Como smoke test funcional:

> *"Llamá a la tool `list_repos` y mostrame el resultado."*

Si devuelve JSON (aunque sea vacío `{ "total": 0, "repos": [] }`), el MCP funciona.

### Troubleshooting específico

Ver `CONFIGURACION-MCP.md § Troubleshooting` y `SETUP.md § Troubleshooting` del repo upstream. Los clásicos:

- **"Vault no encontrado"** → path en `src/config.ts` no existe en disco, o no escapaste backslashes en Windows.
- **"Participantes inválidos"** en `create_meeting_note` → el nombre no coincide con `TEAM_MEMBERS` (case-sensitive).
- **MCP arranca pero tools no aparecen** → faltó `npm run build` tras editar config.
- **GitHub tools fallan con 401** → `GITHUB_TOKEN` vencido o sin scope `repo:read`.

## 2. github MCP (oficial)

Complementa al tooling de git del MCP custom. Útil para operaciones de PR/issue/comments.

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

Va en `~/.claude.json` (config global personal — **no commitear**). Scope del token: `repo`.

## 3. playwright MCP (opcional)

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

Primera ejecución baja navegadores (~300 MB).

## 4. Plugin claude-mem

Memoria persistente: cada sesión genera observaciones que se recuperan como contexto al reabrir Claude en el mismo repo.

Queda habilitado vía `~/.claude/settings.json` (si copiaste el template). Si no arranca solo:

```
claude
/plugin install claude-mem@thedotmack
```

Se guarda en `~/.claude/projects/<encoded-repo-path>/memory/`. Es **local por máquina** — cada persona tiene su propia memoria. Para conocimiento compartido usá la vault (con `create_meeting_note` o `create_note`).

> [!note] claude-mem vs Memory del MCP
> Son dos sistemas distintos:
> - **claude-mem** (plugin) → memoria personal tuya entre sesiones de Claude. Local, no se comparte.
> - **Memory del obsidian-vault-mcp** (tool `query_memory`) → memoria del equipo compartida vía las notas en la vault. Se sincroniza con git. Phase 2 eventualmente integra ambos.

## 5. Verificación completa

Dentro de Claude en un repo con `.mcp.json`:

```
/mcp                      # obsidian-vault-mcp connected, github connected
/plugin list              # claude-mem instalado
```

Como smoke test integral:

> *"Usando el MCP, listame los repos trackeados (list_repos) y después listame los subjects del vault DATAOILERS (list_subjects)."*

Si ambas responden, el setup funciona. También podés correr el `verify.sh` de este onboarding para checks automáticos.
