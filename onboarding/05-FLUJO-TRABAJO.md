# 05 — Flujo de trabajo diario

Esto es cómo usar Claude + vault en el día a día, una vez todo está configurado.

## Al arrancar el día

```bash
# sincronizar la vault
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git pull
git submodule update --remote --merge
```

O correr `~/bin/vault-sync.sh` si seguiste la sección de scripts en [`04-VAULT-STRUCTURE.md`](04-VAULT-STRUCTURE.md).

Después entrás al repo de código y abrís Claude:

```bash
cd ~/Escritorio/DataOilers/itmind-infrastructure
claude
```

`claude-mem` te muestra un resumen de lo último que hicimos en el repo — no tenés que explicar contexto otra vez.

## Cuándo documentar en la vault

Regla: **si alguien del equipo puede necesitar entender esto sin vos en 3 meses, va a la vault**.

| Situación | Carpeta |
|---|---|
| "Voy a cambiar X en Y, así lo pienso hacer" | `Specs/` |
| "Decidimos A en vez de B por Z" | `Decisiones/` (ADR) |
| "Se cayó producción porque X, la arreglé así" | `Postmortems/` |
| "Cómo funciona la conexión con el servicio externo Y" | `Referencias/` |
| "Comandos que uso todo el tiempo en este repo" | `Referencias/runbook.md` |

Cosas que **no** van a la vault:
- Código (va al repo)
- Comentarios de review (van al PR)
- Estado de tareas en curso (va al plan de Claude o al issue tracker)

## Patrones de uso de Claude

El MCP `obsidian-vault-mcp` expone 20+ tools organizadas en 4 categorías: **Obsidian** (notas), **Git** (contexto de repos), **Meeting/Memory** (reuniones/decisiones/action items), **Linking** (commits ↔ decisiones).

> [!info] Referencia completa
> Ver [`TOOLS.md`](https://github.com/data-oilers/obsidian-vault-mcp/blob/main/TOOLS.md) del upstream para signatures detalladas de cada tool. Acá documento los prompts que mejor las disparan.

### Obsidian tools — notas en las vaults

#### `list_subjects` — ver estructura de una vault
> *"Listá los subjects de la vault DATAOILERS."*

#### `search_notes` — buscar contenido
> *"Buscá 'Workload Identity' en la vault DATAOILERS."*

#### `read_note` — leer una nota entera
> *"Leeme V-02-FIX-01 del vault DATAOILERS/Specs."*

Claude suele encadenar `search_notes` → `read_note` automáticamente si pedís "leeme la nota sobre X" sin path exacto.

#### `create_note` — crear nota
> *"Creá una nota en Specs/ de DATAOILERS con el diseño de la migración de Alembic. Tipo: research. Contexto: [...]."*

#### `append_to_note` / `update_note`
> *"Agregá al spec V-02-FIX-01 una sección bajo '## Validación' con el resultado de los smoke tests."*
>
> *"Reescribí el runbook deploy-qa para incluir el nuevo paso de alembic upgrade antes del Helm upgrade."*

Tip para append: siempre indicar el **heading**. Sin eso pega al final.

### Git tools — contexto de repos

Requiere `GITHUB_TOKEN` + `GITHUB_ORG` en el `.env` del MCP para auto-discovery. Alternativamente, registrar repos locales manualmente en `src/config.ts`.

#### `list_repos` — qué repos track el MCP
> *"¿Qué repos estamos trackeando?"*

#### `get_repo_context` — actividad reciente de un repo
> *"¿Qué pasó en itmind-infrastructure en las últimas 2 semanas?"*
>
> *"Mostrame el contexto del repo enterprise-ai-platform — commits, rama actual, quién está activo."*

#### `get_file_history` — histórico de un archivo
> *"¿Quién tocó `terraform/workloads-ai/main.tf` en las últimas semanas?"*

#### `get_commit_info` — detalles de un commit
> *"Dame el detalle del commit HEAD~3 en itmind-infrastructure."*

#### `get_repo_stats` — estadísticas por autor
> *"¿Quién fue el más activo en enterprise-ai-platform este mes?"*
>
> *"Estadísticas semanales de commits en itmind-infrastructure."*

### Meeting & Memory tools — el flow central del equipo

El MCP está diseñado alrededor del ciclo **reunión → decisión → action item → commit que implementa**. Las tools de Memory cierran ese loop.

#### `create_meeting_note` — capturar una reunión
> *"Registrá la reunión de hoy: fecha 2026-04-24, título 'Migración Alembic QA', participantes Lautaro y Franco, decisiones: ['Usar merge migration para resolver heads múltiples', 'Agregar CI check en GitHub Actions'], action items: [{task: 'Implementar check_alembic_heads.py', owner: Lautaro, dueDate: 2026-04-25}], summary: 'Resolvimos el blocker del deploy QA', relatedRepos: [enterprise-ai-platform]."*

Importante: `participants` y `owner` deben ser nombres **exactos** del `TEAM_MEMBERS` (case-sensitive). Si te equivocás te da error con los nombres válidos.

#### `query_memory` — buscar en la memoria del equipo
> *"¿Qué decisiones tomamos sobre auth en las últimas 4 semanas?"*
>
> *"Buscá en memory: decisiones de Lautaro relacionadas con enterprise-ai-platform."*
>
> *"¿Qué reuniones hubo el mes pasado sobre migraciones?"*

#### `get_team_context` — snapshot del equipo
> *"Dame un resumen de la actividad del equipo este mes."*
>
> *"¿Qué pasó la última semana? ¿Quién trabajó en qué?"*

#### `list_action_items` — qué está pendiente
> *"¿Qué action items tengo pendientes?"* (Claude usa tu usuario)
>
> *"Items de acción pendientes del equipo."*
>
> *"¿Qué action items están vencidos?"*

### Linking & Advanced Search (Phase 2)

#### `auto_link_commits` — auto-detectar commits que implementan decisiones
> *"Ejecutá auto_link_commits sobre la decisión de 'migrar Redis password a Secret Manager' y mostrame qué commits matchearon."*

#### `get_decision_timeline` — ver evolución de una decisión
> *"Dame el timeline de la decisión <decisionId>: reunión inicial, commits que la implementaron, si está completada."*

#### `get_decision_impact` — ver qué tocó una decisión
> *"¿Qué impacto tuvo la decisión de usar Workload Identity? Qué repos, archivos, personas."*

#### `advanced_search` — búsqueda con ranking
> *"advanced_search: query='oauth pkce', types=[meeting, decision], sort=relevance, limit=10"*

### Patrones compuestos (multi-tool)

#### Registrar reunión + linkear con código
> *"Acabamos de reunirnos con Franco sobre el deploy QA bloqueado. Registrá la meeting con las decisiones y action items, y después corré auto_link_commits sobre la decisión principal para ver si algún commit de hoy ya la implementa."*

#### Postmortem con contexto del repo
> *"Generá un postmortem del incidente de hoy en QA. Primero traeme `get_repo_context` de enterprise-ai-platform (últimas 24h), después `list_action_items` para ver si quedó algo pendiente, y recién ahí creá la nota en Postmortems/ con timeline + root cause + action items nuevos."*

#### Auditoría semanal
> *"Dame un `get_team_context` de esta semana, listame los action items pendientes con dueDate vencido, y hacé una search en memory de las decisiones abiertas. Compilá todo en una nota `Referencias/auditoria-semanal-2026-04-24.md`."*

#### Sincronizar decisión con el código
> *"Leé la decisión de usar merge migrations (`query_memory` con filtro), después `get_file_history` sobre `migrations/` en enterprise-ai-platform, y finalmente `mark_decision_complete` si la decisión ya está implementada."*

### Anti-patterns

❌ **"Editá el archivo X del vault"** — si no nombrás la vault, Claude puede usar `Write` directo y esquivar el MCP (perdés templates + no se guarda en memory).

❌ **`create_meeting_note` con nombres inventados** — `participants` tiene que matchear `TEAM_MEMBERS` exactamente. Si ponés "Lauti" en vez de "Lautaro", falla.

❌ **Pegarle 2000 líneas de log y pedir "hacé un postmortem"** — resumí primero a mano. El MCP escribe, no resume input.

❌ **Usar tools de Git sin GITHUB_TOKEN configurado** — `list_repos` devuelve vacío, `get_repo_context` falla. Completá el `.env` del MCP antes de usar estas tools.

## Convención de commits en las vaults

| Tipo | Cuándo | Ejemplo |
|---|---|---|
| `docs:` | nuevo documento, actualización mayor | `docs: agregar spec V-02-FIX-01` |
| `fix:` | corregir info incorrecta | `fix: corregir paths en runbook Airflow` |
| `chore:` | metadata, tags, links, cleanup | `chore: agregar wikilinks a Q-V-03` |
| `refactor:` | reorganizar estructura | `refactor: mover postmortems Q1 a subcarpeta` |

En la vault general (meta repo), los commits suelen ser:
- `chore: bump <subvault> to <sha>` — cuando actualizás el puntero del submodule

## Al terminar el día

```bash
# si editaste alguna subvault
cd ~/Documentos/PROYECTOS/dataoilers-vault-org/<subvault>
git add .
git commit -m "docs: ..."
git push

# actualizar el meta repo
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git add <subvault>
git commit -m "chore: bump <subvault>"
git push
```

O usar `~/bin/vault-push.sh` del script en [`04-VAULT-STRUCTURE.md`](04-VAULT-STRUCTURE.md).

## Slash commands de Claude útiles

| Comando | Qué hace |
|---|---|
| `/status` | Info del modelo, contexto, working dir |
| `/mcp` | Estado de los MCP servers (conectados/fallando) |
| `/plugin list` | Plugins instalados |
| `/plan` | Entra en modo plan — Claude diseña antes de editar |
| `/loop 5m <cmd>` | Ejecuta `<cmd>` cada 5 minutos (polling de builds, etc.) |
| `/clear` | Reset de contexto sin salir |
| `/compact` | Resume la conversación para liberar contexto |

## Cuándo NO usar Claude

- Commits triviales (cambio de una línea) — hacelo a mano, es más rápido.
- Revisar un PR pequeño ya escrito — leelo vos, tarda menos.
- Tareas donde el contexto cambia a mitad de camino sin que Claude lo sepa (tocaste algo en la UI de GCP sin decirle).

## Cuándo SÍ usar Claude para tareas rutinarias

- Escribir/actualizar documentación (punto fuerte).
- Orquestar comandos multi-paso (deploy + verify + rollback).
- Explorar un repo nuevo — `Explore` agent es muy bueno.
- Generar boilerplate repetitivo.
- Escribir tests.

## Buenas prácticas de prompt

- Decirle **qué** querés y **por qué**, no solo qué comando correr.
- Si pedís un cambio, decile qué **no** tocar.
- Para tareas largas, arrancar con "entrá en modo plan" — te muestra el approach antes de ejecutar.
- Si te dice "parece que X" pero no lo verificó, pedirle explícitamente "confirmalo leyendo el archivo".
