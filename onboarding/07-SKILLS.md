# 07 — Skills de Claude Code

Las **skills** son paquetes de instrucciones + scripts que Claude carga cuando son relevantes. Funcionan como "expertise injection": en vez de explicarle a Claude cómo hacer un PDF con fuentes correctas, tenés una skill `pdf` que se activa cuando detecta `.pdf` en tu pedido.

Hay dos formas de instalarlas:

| Fuente | Dónde se instala | Cómo |
|---|---|---|
| **Plugins** del marketplace oficial (ej: `claude-mem`) | `~/.claude/plugins/` | `/plugin install <nombre>@<marketplace>` dentro de Claude |
| **Skill packs** de GitHub (ej: `anthropics/skills`) | `~/.claude/skills/<nombre>/` | `git clone <url> ~/.claude/skills/<nombre>` |

Claude carga automáticamente las skills que aplican a tu request. Las podés invocar explícitamente con `/<nombre-skill>` si sabés cuál querés.

## Plugins (via marketplace)

Ya configurados en el `~/.claude/settings.json` del template. Se auto-instalan la primera vez que abrís Claude.

| Plugin | Obligatorio | Qué aporta |
|---|---|---|
| `claude-mem@thedotmack` | **Sí** | Memoria persistente entre sesiones: cada chat genera observaciones que se traen de vuelta como contexto cuando reabrís Claude en el mismo repo. |
| `vercel@claude-plugins-official` | Solo si usás Vercel | Comandos para deploys, env vars, logs. |

Si no se auto-instalan:
```
claude
/plugin install claude-mem@thedotmack
/plugin install vercel@claude-plugins-official
```

## Skill packs (via git clone)

Son repos públicos en GitHub que clonás en `~/.claude/skills/`. Claude los detecta automáticamente al siguiente startup.

### Esenciales para trabajar con vaults

| Skill pack | Repo | Qué aporta |
|---|---|---|
| `obsidian-skills` | [`kepano/obsidian-skills`](https://github.com/kepano/obsidian-skills) | Obsidian-flavored markdown, wikilinks, callouts, JSON Canvas, CLI, Defuddle (limpia HTML de webs). **Obligatorio** si trabajás con vaults. |
| `skills` | [`anthropics/skills`](https://github.com/anthropics/skills) | Skills oficiales de Anthropic: `xlsx`, `docx`, `pptx`, `pdf`, `canvas-design`, `skill-creator`, `mcp-builder`. Incluye el generador de skills. |

### Recomendadas para dev/infra

| Skill pack | Repo | Qué aporta |
|---|---|---|
| `superpowers` | [`obra/superpowers`](https://github.com/obra/superpowers) | Workflows de dev: TDD, brainstorming, planning, code review, git worktrees, dispatching parallel agents, subagent-driven dev, systematic debugging. Muy útil para tareas complejas. |
| `claude-skills` | [`jezweb/claude-skills`](https://github.com/jezweb/claude-skills) | Colección variada con utilidades generales. |
| `agent-skills` | [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills) | Context engineering, React/Next.js best practices. Útil si tocan frontend o diseñan agentes. |

### Opcionales según rol

| Skill pack | Repo | Cuándo |
|---|---|---|
| `marketingskills` | [`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills) | Solo si alguien hace marketing/content/SEO (no es el caso del equipo infra). |
| `youtube-skills` | [`ZeroPointRepo/youtube-skills`](https://github.com/ZeroPointRepo/youtube-skills) | Si necesitás transcribir/procesar videos de YouTube. |
| `awesome-claude-skills` | [`ComposioHQ/awesome-claude-skills`](https://github.com/ComposioHQ/awesome-claude-skills) | Colección curada general. |

## Instalación manual

```bash
mkdir -p ~/.claude/skills
cd ~/.claude/skills

# Esenciales
git clone https://github.com/kepano/obsidian-skills.git
git clone https://github.com/anthropics/skills.git

# Recomendadas dev
git clone https://github.com/obra/superpowers.git
git clone https://github.com/jezweb/claude-skills.git
git clone https://github.com/vercel-labs/agent-skills.git
```

Reiniciar Claude (cerrar y abrir). Con `/help` o empezando a escribir `/` deberían aparecer los nuevos comandos.

## Instalación automatizada

Hay un script que hace todo lo de arriba con un flag para elegir set mínimo o completo:

```bash
./install-skills.sh --minimal    # solo esenciales (obsidian + skills oficial)
./install-skills.sh --dev        # esenciales + superpowers + claude-skills + agent-skills
./install-skills.sh --all        # todo lo que usa Lautaro
```

Por default (`./install-skills.sh` sin flags) instala el set `--dev`.

## Cómo descubrir qué skills tenés disponibles

Dentro de Claude:

```
/help
```

Muestra la lista de skills invocables directamente. También empezar a tipear `/` y Claude autocompleta.

Para ver el detalle de una skill específica:

```bash
cat ~/.claude/skills/<skill-pack>/<skill-name>/SKILL.md
# o
cat ~/.claude/skills/<skill-pack>/README.md
```

## Skills invocables más útiles (cheatsheet)

### De obsidian-skills
- `/obsidian-markdown` — al escribir/editar markdown en el vault. Aplica wikilinks, callouts, properties.
- `/obsidian-cli` — interactuar con Obsidian desde CLI: leer/crear/tags/search.
- `/defuddle` — extraer contenido limpio de una URL en markdown (mejor que `WebFetch` para docs web).
- `/json-canvas` — crear `.canvas` de Obsidian (mind maps, flowcharts).
- `/obsidian-bases` — crear `.base` para views tipo database.

### De skills (anthropics)
- `/pdf` — crear o leer PDFs.
- `/xlsx` — trabajar con spreadsheets (leer, modificar, crear).
- `/docx` — documentos Word.
- `/pptx` — presentaciones PowerPoint.
- `/skill-creator` — crear tus propias skills.

### De superpowers
- `/superpowers-brainstorming` — disparar brainstorming estructurado antes de empezar algo nuevo.
- `/superpowers-writing-plans` — convertir un spec en un plan de implementación.
- `/superpowers-executing-plans` — ejecutar un plan con checkpoints.
- `/superpowers-systematic-debugging` — debug disciplinado ante bugs raros.
- `/superpowers-test-driven-development` — TDD antes de escribir código.
- `/superpowers-using-git-worktrees` — aislar feature branches en worktrees.
- `/superpowers-dispatching-parallel-agents` — lanzar agentes en paralelo para tareas independientes.

### De claude-mem (plugin)
- `/claude-mem:mem-search` — buscar en la memoria: *"¿ya resolvimos X?"*
- `/claude-mem:make-plan` — generar plan fasesado con discovery previo.
- `/claude-mem:do` — ejecutar un plan de make-plan con subagents.
- `/claude-mem:smart-explore` — explorar código con AST (más eficiente que grep).
- `/claude-mem:timeline-report` — reporte narrativo del historial del proyecto.

## Cómo crear tus propias skills

Si tu equipo genera workflows que se repiten (ej: "siempre que X, aplicar Y"), conviene armarlos como skill. Usá el generador oficial:

```
/skill-creator
```

Te guía interactivamente para armar `SKILL.md`, tests, assets. Guardar el resultado en:

```
~/.claude/skills/<tu-nombre>/<skill-name>/
```

O — mejor aún — en un repo de la org `dataoilers-skills` que el equipo entero pueda clonar. En ese caso agregarlo a `install-skills.sh`.

## Troubleshooting skills

### `/<skill>` no aparece en autocompletado
- ¿Está clonado? `ls ~/.claude/skills/`
- ¿Reiniciaste Claude? Las skills se indexan al startup.
- ¿Tiene `SKILL.md` válido? Chequear que el repo haya bajado completo, no un clone roto.

### Una skill ejecuta algo raro o desactualizado
Las skills se versionan con el repo. Actualizar:
```bash
cd ~/.claude/skills/<skill-pack>
git pull
```

O usar un script helper:
```bash
for d in ~/.claude/skills/*/; do [[ -d "$d/.git" ]] && git -C "$d" pull --ff-only; done
```

### "Skill collision" — dos skills con el mismo nombre
Claude usa la primera que matchea. Si dos packs definen `/pdf`, gana el que se cargó primero. Si molesta: renombrar uno de los folders o borrar el que no uses.
