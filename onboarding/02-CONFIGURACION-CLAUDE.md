# 02 — Configuración de Claude Code

Claude Code lee configs de tres lugares, de menor a mayor prioridad:

1. **Global del usuario**: `~/.claude/CLAUDE.md` y `~/.claude/settings.json`
2. **Del proyecto (versionado)**: `<repo>/CLAUDE.md` y `<repo>/.mcp.json`
3. **Del proyecto (local, ignorado por git)**: `<repo>/.claude/settings.local.json`

Vamos a configurar los tres niveles.

## 1. Config global — `~/.claude/`

### `~/.claude/CLAUDE.md`

Copiá el archivo `templates/CLAUDE.md` de este paquete a `~/.claude/CLAUDE.md`.

```bash
mkdir -p ~/.claude
cp templates/CLAUDE.md ~/.claude/CLAUDE.md
```

Este archivo le dice a Claude:
- Qué convención usamos para vaults de Obsidian
- Dónde viven las vaults en disco (`~/Documentos/PROYECTOS/<proyecto>/`)
- Reglas de frontmatter, wikilinks, callouts
- Que la documentación se publica **además** en la vault, no solo en el repo

**Editá el archivo** antes de copiarlo si tu home o estructura de carpetas difieren de las mías.

### `~/.claude/settings.json`

Copiá `templates/settings.json`:

```bash
cp templates/settings.json ~/.claude/settings.json
```

Contiene:
- `permissions.defaultMode: "auto"` — Claude pide permiso para acciones sensibles pero no spammea el prompt
- `enabledPlugins` — claude-mem (memoria entre sesiones) y vercel (opcional)
- `extraKnownMarketplaces` — fuentes para los plugins
- `effortLevel: "high"` — más "thinking" en respuestas

### `~/.claude/settings.local.json` (opcional, por-máquina)

Permisos scoped a tu usuario (no se versiona ni se comparte). Útil si querés permitir `Bash(npm run:*)` sin pedir confirmación cada vez.

Ver ejemplo en `templates/settings.local.json.example`.

## 2. Config por proyecto — `<repo>/`

En cada repo de la org donde vayas a trabajar con Claude, necesitás:

### `<repo>/CLAUDE.md`
Instrucciones específicas del proyecto (stack, comandos útiles, convenciones del repo). Copiá `templates/proyecto.CLAUDE.md` como punto de partida y editá.

**Este archivo SÍ se versiona** — se comparte con todo el equipo vía el repo.

### `<repo>/.mcp.json`
Registra el MCP server de obsidian-vault apuntando a la vault de ese repo. Copiá `templates/mcp.json` y editalo para que `vaultName` y `vaultPath` apunten a la vault del repo.

**Este archivo SÍ se versiona** — así todo el equipo apunta al mismo MCP con los mismos nombres de vault.

### `<repo>/.claude/settings.local.json`
Permisos locales al proyecto, no se versiona (va en `.gitignore` del repo por default).

## 3. Plugins de Claude Code

Los plugins declarados en `~/.claude/settings.json` (`enabledPlugins`) se bajan automáticamente la primera vez que abrís Claude. Si no se bajan solos:

```bash
claude
/plugin install claude-mem@thedotmack
/plugin install vercel@claude-plugins-official   # opcional
```

### Plugins recomendados

| Plugin | Qué hace | Obligatorio |
|---|---|---|
| `claude-mem` | Memoria persistente entre sesiones, recupera contexto de trabajos anteriores | **Sí** |
| `vercel` | Comandos específicos para deploys en Vercel | Solo si usás Vercel |

## 4. Verificación

```bash
cd <cualquier-repo-de-la-org>
claude
# dentro de Claude:
/mcp           # debería listar obsidian-vault
/plugin list   # debería listar claude-mem
/status        # muestra el modelo activo y contexto cargado
```

Pedí algo como: *"listá los subjects del vault <nombre>"* — si responde con la estructura de carpetas, todo OK.

Seguí con [`03-MCP-Y-PLUGINS.md`](03-MCP-Y-PLUGINS.md).
