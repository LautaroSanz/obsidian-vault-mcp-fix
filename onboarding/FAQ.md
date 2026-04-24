# FAQ

## Setup

### ¿Puedo usar mi cuenta personal de Claude o necesito una de la org?
Tu cuenta personal con plan Pro/Max sirve. Claude Code no soporta seats compartidos en un mismo plan — cada persona tiene la suya. Si la org quiere facturar centralizado, hay que ir por API key vía Bedrock/Vertex y coordinar con finance.

### ¿Puedo correr Claude sin plan, pagando por uso (API key)?
Sí, con `export ANTHROPIC_API_KEY=...`. Conviene hacer la cuenta: a uso intensivo diario, el plan Max suele salir más barato que pay-as-you-go.

### ¿Qué versión de Node necesito?
≥ 20. Recomendado 22 LTS. El MCP usa ESM + top-level await, Node < 20 no los soporta.

### ¿Funciona en Windows?
Sí, Claude Code tiene instalador Windows y app desktop. El `setup.sh` necesita WSL o Git Bash para correr (es bash). Para el MCP alcanza con tener Node + git en Windows nativo. El upstream fue desarrollado originalmente en Windows, así que los docs tienen ejemplos de paths Windows directos (`C:\...`, `D:\...`).

### `setup.sh` pide confirmar cada paso, ¿hay modo non-interactive?
No por ahora, a propósito — es idempotente y pide confirmación solo donde puede borrar algo.

## Vault y sincronización

### ¿Necesito Obsidian Sync?
**No**. Usamos git privado de la org como mecanismo de sincronización — gratis, versionado, ya integrado con nuestros flujos.

### ¿Qué pasa si dos personas editan la misma nota?
Conflicto de merge en el `.md`. Obsidian muestra los marcadores `<<<<<<<` / `>>>>>>>` como texto; resolvés a mano y commiteás. Para reducir conflictos, instalá el plugin **Obsidian Git** con auto-backup cada 5 min.

### ¿Claude puede ver las vaults de otros compañeros?
Solo si las tenés clonadas en tu disco local y las declaraste en el `VAULTS` de `src/config.ts` del MCP. El MCP lee archivos locales — no hace llamadas a la red. No hay "servidor central" de vaults: cada persona ve lo que pulled.

### ¿El MCP `obsidian-vault-mcp` funciona sin Obsidian abierto?
**Sí**. El MCP lee y escribe archivos `.md` directamente del filesystem. Obsidian no tiene que estar corriendo. Si Obsidian está abierto, detecta cambios y los muestra (a veces con 1–2 seg de delay).

### ¿Cómo agrego una vault nueva?
Hasta que upstream refactorice a config externa: editá `~/obsidian-vault-mcp/src/config.ts`, agregá la entrada al objeto `VAULTS`, `npm run build`, reiniciá Claude. Si te molesta tocar TS, coordinar con quien mantiene el repo para refactor.

### ¿Cómo agrego un nuevo repo al ecosistema vault?
1. Crear repo privado `dataoilers-vault-<nombre>` en la org.
2. Inicializarlo con el skeleton: `cp -r templates/vault-skeleton/* <repo>/`, `git init`, push.
3. Agregarlo al meta repo como submodule: `git submodule add <url> <nombre>`.
4. Cada persona del equipo agrega la nueva vault a su `src/config.ts` local del MCP y rebuildea.

### ¿Por qué submodules y no un monorepo único?
Permisos granulares + commits limpios por repo + historia independiente. Trade-off: pelear un poco con submodules. Si el equipo crece y el dolor supera al valor, migramos a monorepo simple.

## MCP y Claude

### ¿Por qué el MCP `obsidian-vault-mcp` es custom y no usamos el oficial de filesystem?
Porque es **mucho más que filesystem**: combina Obsidian + Git (contexto de repos vía GitHub org) + Memory (reuniones/decisiones/action items) + Linking automático entre commits y decisiones. El `server-filesystem` oficial solo cubriría el 20% (notas).

### ¿Qué pasa si no tengo `GITHUB_TOKEN` configurado?
Las tools de Git (`list_repos`, `get_repo_context`, `get_repo_stats`, etc.) no funcionan o devuelven vacío. El resto (Obsidian, Meeting/Memory) sigue OK. Recomendado configurarlo.

### ¿Cómo genero el `GITHUB_TOKEN`?
https://github.com/settings/personal-access-tokens/new — scopes `repo:read` + `org:read`. Pegar en `~/obsidian-vault-mcp/.env` como `GITHUB_TOKEN=ghp_...`. **Nunca commitearlo** (`.env` está en `.gitignore` del MCP).

### `create_meeting_note` me dice "Participantes inválidos"
Los nombres en `participants` y `owner` tienen que matchear **exactamente** los del `TEAM_MEMBERS` en `src/config.ts` (case-sensitive). Si tu nombre no está, agregalo al array y rebuildeá.

### ¿Dónde se guarda la memoria del MCP (reuniones, decisiones)?
Phase 1 actual: **in-memory** — se pierde cuando reiniciás el proceso del MCP. Phase 2 (en progreso) integra persistencia real con claude-mem. Mientras tanto: al crear `create_meeting_note`, la nota markdown **sí persiste** en la vault; lo que se pierde al reiniciar es el índice en memoria (pero `query_memory` igual busca en las notas).

### ¿Dónde se guarda la memoria de `claude-mem` (plugin)?
Distinto de la Memory del MCP. `claude-mem` guarda en `~/.claude/projects/<encoded-repo-path>/memory/`. Es **local por máquina** — cada persona genera su propia historia.

### ¿claude-mem se comparte entre compañeros?
No. Es para tu contexto personal en cada repo. Para conocimiento compartido del equipo, usá el flow de meetings del MCP (`create_meeting_note`) — esas notas sí van a la vault y se sincronizan.

### ¿Cómo desactivo el MCP sin desinstalarlo?
En Claude: `/mcp disable obsidian-vault-mcp`. O editar el `.mcp.json` del repo y quitar la entrada.

### Claude me pide permiso cada vez que usa `create_note`, ¿cómo lo evito?
Agregá a `~/.claude/settings.local.json` (ver `templates/settings.local.json.example`):
```json
"allow": [
  "mcp__obsidian-vault-mcp__create_note",
  "mcp__obsidian-vault-mcp__read_note",
  "mcp__obsidian-vault-mcp__search_notes",
  "mcp__obsidian-vault-mcp__list_repos",
  "mcp__obsidian-vault-mcp__get_repo_context"
]
```

### ¿Cómo pido ver lo que el MCP sabe del equipo?
```
get_team_context timeframe=month
```
O `query_memory` con query genérica: *"query_memory con from=hace-30-días"*.

## Flujo de trabajo

### ¿Cada cuánto hago pull del vault?
Al arrancar el día. Si editás mucho, también pre-lunch y post-lunch. Nunca pushees sin haber pulled antes (evita conflictos de submodule).

### ¿Qué NO va en la vault?
- Código (va al repo de código).
- Secretos, credentials, tokens.
- Estado de tareas personales en curso (plans, todos, scratchpads).
- Screenshots pesados sin comprimir (>2 MB).
- Datos con PII de clientes.

### ¿Puedo hacer `git push --force` en una subvault?
Técnicamente sí, pero NO lo hagas salvo que seas el único que editó ese día. Si pusiste algo por error, preferir `git revert`.

### ¿Cada commit a una subvault me obliga a pushear el meta repo también?
Sí, si querés que los compañeros vean tu cambio vía `git submodule update --remote`. El meta solo trackea el SHA de cada subvault — si no lo bumpeás, los otros siguen viendo la versión vieja.

Tip: el script `~/bin/vault-push.sh` de [`04-VAULT-STRUCTURE.md`](04-VAULT-STRUCTURE.md) lo hace de una pasada.

### ¿Hay un canal para coordinar cambios grandes de vault?
Acordar con el equipo. Por convención, cambios estructurales (nuevas carpetas top-level, renombrar subvaults, eliminar notas) se anuncian antes de pushear.

## Troubleshooting específico

### `claude` no encuentra `obsidian-vault-mcp` aunque `verify.sh` dice OK
Casi siempre es que no aceptaste el prompt de "trust MCP server" la primera vez. Cerrá Claude, borrá el cache: `rm -f ~/.claude/mcp-needs-auth-cache.json`, reabrí.

### El MCP lee la config vieja aunque la edité
Dos razones posibles:
1. Olvidaste `npm run build` tras editar `src/config.ts`. La config se compila en `dist/`.
2. El MCP carga una sola vez por proceso. Reiniciá Claude o dentro de Claude: `/mcp reconnect obsidian-vault-mcp`.

### Claude editó un archivo del vault con `Write` en lugar del MCP
Pasa si pediste sin mencionar el vault. Reforzá: *"usando el MCP obsidian-vault-mcp, actualizá..."*. También agregar al `CLAUDE.md` del repo: "Prefiero el MCP obsidian-vault-mcp sobre `Write` para archivos dentro de `~/Documentos/PROYECTOS/dataoilers-vault-org/`".

### Los compañeros ven los archivos `.md` pero Obsidian los renderiza raro
Falta commitear el `.obsidian/` del meta vault. Asegurate que esa carpeta esté en git.

---

¿Una pregunta que no está acá? Abrila como issue o sumala por PR.
