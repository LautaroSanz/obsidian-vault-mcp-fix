# Onboarding Claude Code + Obsidian — DataOilers

Material para que cualquier persona del equipo tenga el mismo setup de Claude Code + MCP del equipo + vaults de Obsidian + skills, y pueda leer/editar/crear documentación de los repos de la org de la misma manera.

## Dos repos de referencia

| Repo | Qué tiene | Mantenedor |
|---|---|---|
| [`data-oilers/obsidian-vault-mcp`](https://github.com/data-oilers/obsidian-vault-mcp) | El **MCP server** que usa todo el equipo (código, docs del MCP). Fuente canónica para tools y config. | Upstream |
| `data-oilers/dataoilers-vault-org` *(pendiente de crear)* | El **meta vault** (git repo con submodules de las vaults por repo). | Pendiente |

Este onboarding (`DATAOILERS-ONBOARDING-CLAUDE/`) **no es un repo**, es material local para instalar lo anterior. Se complementa con los docs del upstream — no los duplica.

## Qué resuelve este paquete

1. **Claude Code configurado igual en todas las máquinas** — mismas configs, plugins, skills, convenciones.
2. **obsidian-vault-mcp instalado + compilado + registrado** en cada máquina apuntando al upstream.
3. **Vaults de Obsidian sincronizadas vía git privado** una vez que el meta repo exista.
4. **Convenciones compartidas** (frontmatter, estructura de carpetas, naming) dentro de las vaults.

## Arquitectura en una frase

> Cada repo de código tiene su vault en un repo git privado hermano (ej: `itmind-infrastructure` → `dataoilers-vault-itmind-infrastructure`). Un repo meta (`dataoilers-vault-org`) las agrupa como submodules. Obsidian se abre sobre el meta. El MCP `obsidian-vault-mcp` conecta Claude con esas vaults + el git/GitHub de la org + memoria compartida de reuniones y decisiones.

## Quick start

Si tenés apuro, seguí el [`DAY-1-CHECKLIST.md`](DAY-1-CHECKLIST.md).

Esta carpeta vive dentro del repo `data-oilers/obsidian-vault-mcp`. El flujo esperado:

```bash
# 1. Cloná el repo del MCP (si no lo clonaste ya)
git clone https://github.com/data-oilers/obsidian-vault-mcp.git ~/obsidian-vault-mcp

# 2. Entrá al onboarding
cd ~/obsidian-vault-mcp/onboarding

# 3. Setup automático
./setup.sh           # detecta que ~/obsidian-vault-mcp ya es clone, copia ~/.claude/ configs
./install-skills.sh  # clona skill packs recomendados (obsidian-skills, superpowers, etc.)

# 4. Config manual mínima
#    - Editar ~/obsidian-vault-mcp/.env con tu GITHUB_TOKEN personal
#    - Si tus vaults NO están en ~/Documentos/<NAME>, setear VAULTS_<NAME>_PATH en .env
cd ~/obsidian-vault-mcp && npm install && npm run build && cd onboarding

# 5. Smoke test
./verify.sh
```

## Orden sugerido de lectura

1. [`01-INSTALACION.md`](01-INSTALACION.md) — Claude Code, Node, Obsidian, git
2. [`02-CONFIGURACION-CLAUDE.md`](02-CONFIGURACION-CLAUDE.md) — `~/.claude/CLAUDE.md` y `~/.claude/settings.json`
3. [`03-MCP-Y-PLUGINS.md`](03-MCP-Y-PLUGINS.md) — **obsidian-vault-mcp**, GitHub MCP, plugin claude-mem
4. [`04-VAULT-STRUCTURE.md`](04-VAULT-STRUCTURE.md) — cómo se organizan las vaults y submodules
5. [`05-FLUJO-TRABAJO.md`](05-FLUJO-TRABAJO.md) — las 20+ tools del MCP con prompts de ejemplo
6. [`06-TROUBLESHOOTING.md`](06-TROUBLESHOOTING.md) — problemas comunes
7. [`07-SKILLS.md`](07-SKILLS.md) — skill packs (obsidian-skills, superpowers, skills oficiales)
8. [`FAQ.md`](FAQ.md) — preguntas frecuentes
9. [`DAY-1-CHECKLIST.md`](DAY-1-CHECKLIST.md) — checklist de primer día

## Docs de referencia del MCP (upstream)

Para entender el MCP en profundidad, leer en el repo `data-oilers/obsidian-vault-mcp`:

- [`QUICK-START.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/QUICK-START.md) — Registrar en Claude en 3 pasos.
- [`SETUP.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/SETUP.md) — Setup detallado (env vars, team members, repos).
- [`CONFIGURACION-MCP.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/CONFIGURACION-MCP.md) — Config paso-a-paso (vaults, GitHub, Claude Code).
- [`TOOLS.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/TOOLS.md) — Referencia de cada tool con parámetros y ejemplos.
- [`USAGE.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/USAGE.md) — Casos de uso reales.
- [`EXAMPLES.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/EXAMPLES.md) — Ejemplos detallados.
- [`ROADMAP.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/ROADMAP.md) — Phase 1 ✅, Phase 2 en progreso, Phase 3+.

Nuestro onboarding solo cubre lo que el upstream no cubre: setup en Linux/Mac (el upstream asume Windows), integración con nuestro workflow de vaults/submodules/skills/claude-mem, scripts de automatización.

## Scripts

| Script | Qué hace |
|---|---|
| [`setup.sh`](setup.sh) | Bootstrap: clona `data-oilers/obsidian-vault-mcp` en `~/obsidian-vault-mcp/`, `npm install && npm run build`, copia templates a `~/.claude/`, clona meta vault si `VAULT_REPO` está seteado. Idempotente. |
| [`verify.sh`](verify.sh) | Smoke test: binarios, configs de Claude, MCP compilado + arranca OK, `.env` completado, meta vault, plugin claude-mem. |
| [`install-skills.sh`](install-skills.sh) | Clona skill packs en `~/.claude/skills/`. Flags: `--minimal`, `--dev` (default), `--all`. |

## Templates listos para copiar

En `templates/`:

| Archivo | Dónde va | Qué es |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Instrucciones globales para Claude (convención de vaults) |
| `settings.json` | `~/.claude/settings.json` | Config global (permisos default, plugins) |
| `settings.local.json.example` | `<repo>/.claude/settings.local.json` | Permisos scoped al repo |
| `mcp.json` | `<repo>/.mcp.json` | Registro del `obsidian-vault-mcp` en un repo |
| `proyecto.CLAUDE.md` | `<repo>/CLAUDE.md` | Instrucciones project-level |
| `vault-skeleton/` | Punto de partida de una nueva vault | Carpetas Specs/Decisiones/Postmortems/Referencias con templates |

## Pre-requisitos de la org (estado actual)

- ✅ Repo `data-oilers/obsidian-vault-mcp` — **existe**, Phase 1 completo, Phase 2 en progreso.
- ⏳ Repo `data-oilers/dataoilers-vault-org` (meta vault) — **pendiente de crear**.
- ⏳ Repos `data-oilers/dataoilers-vault-<nombre-repo>` por cada repo de código — **pendientes**.
- ⏳ Equipo/grupo en GitHub con acceso `write` a los repos de vault — **pendiente**.

Mientras los repos de vault no existan, el onboarding funciona igual — instala el MCP, las skills, la config de Claude — pero la parte de vault compartida queda para cuando se creen.

Ver [`04-VAULT-STRUCTURE.md`](04-VAULT-STRUCTURE.md) para el bootstrap inicial cuando sea momento.
