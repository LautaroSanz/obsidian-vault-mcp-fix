# Day 1 — Checklist

Copiá este archivo localmente e í tildando. Si algún paso falla, mirá [`06-TROUBLESHOOTING.md`](06-TROUBLESHOOTING.md) o preguntá.

---

## Bloque 1 — Instalación (30 min)

- [ ] Claude Code: `curl -fsSL https://claude.ai/install.sh | bash`
- [ ] `claude --version` devuelve algo
- [ ] Primer login: `claude` → autenticar en el browser con tu cuenta Pro/Max
- [ ] Node 20+: `node --version` → `v20.x` o mayor (usar `nvm` si no)
- [ ] Git: `git config --global user.name` y `user.email` seteados
- [ ] SSH key en GitHub de la org: `ssh -T git@github.com` te saluda por nombre
- [ ] GitHub CLI: `gh auth login` completado
- [ ] Obsidian instalado y abre OK

## Bloque 2 — Clonar el repo del MCP (5 min)

- [ ] `git clone https://github.com/data-oilers/obsidian-vault-mcp.git ~/obsidian-vault-mcp`
- [ ] `cd ~/obsidian-vault-mcp/onboarding`
- [ ] Leí el [`README.md`](README.md)

## Bloque 3 — Setup automático (15 min)

- [ ] `./setup.sh` corrió sin errores hasta el final (copia templates a `~/.claude/`, detecta que `~/obsidian-vault-mcp` ya es clone y solo actualiza)
- [ ] Edité `~/obsidian-vault-mcp/.env`: completé `GITHUB_TOKEN` y `GITHUB_ORG=data-oilers`
- [ ] (Solo si tus vaults NO están en `~/Documentos/<NAME>`) edité `.env` con `VAULTS_<NAME>_PATH`
- [ ] `cd ~/obsidian-vault-mcp && npm install && npm run build` sin errores TypeScript
- [ ] `./install-skills.sh --dev` clonó los skill packs recomendados
- [ ] `./verify.sh` devuelve 0 fallos

## Bloque 4 — Primer repo con Claude (15 min)

- [ ] Entré a un repo de la org: `cd ~/ruta/al/repo`
- [ ] Copié el template: `cp ~/ruta/onboarding/templates/mcp.json .mcp.json`
- [ ] Ajusté el path de `args` en `.mcp.json` con mi usuario real (reemplazar `REEMPLAZAR-USUARIO`)
- [ ] Abrí Claude: `claude`
- [ ] Acepté el prompt "trust this MCP server"
- [ ] `/mcp` muestra `obsidian-vault-mcp: connected`
- [ ] `/plugin list` muestra `claude-mem`
- [ ] `/help` muestra skills de `obsidian-skills`, `superpowers`, `skills` oficiales
- [ ] Le pedí a Claude: *"Usando el MCP, llamá a `list_repos` y mostrame el resultado"* — responde con JSON (vacío si GITHUB_TOKEN aún no está bien seteado, o con lista de repos de data-oilers si sí)

## Bloque 5 — Obsidian abierto (10 min)

- [ ] Abrí Obsidian → "Open folder as vault" → apuntando a mi vault principal (una de las declaradas en `src/config.ts` del MCP)
- [ ] Instalé plugins comunitarios: Dataview, Templater, Obsidian Git
- [ ] (Obsidian Git) configurado con auto-pull al abrir

## Bloque 6 — Primera nota + primera meeting (10 min)

Dentro de Claude, probá las dos vías principales:

**Nota simple** (tool `create_note`):
> *"Creá una nota de prueba en la vault DATAOILERS (o la que hayas declarado) titulada 'onboarding-<mi-usuario>' con contenido: 'Probé el setup el 2026-04-24 y funciona.'"*

- [ ] La nota apareció en Obsidian (refrescá el sidebar si no la ves)

**Meeting note** (tool `create_meeting_note` — es el flow principal del equipo):
> *"Creá una meeting note: vault=DATAOILERS, date=2026-04-24, title='Onboarding <mi-usuario>', participants=[<mi-nombre>], decisions=['Completé el setup de Claude + MCP'], actionItems=[{task: 'Probar create_meeting_note', owner: <mi-nombre>, dueDate: 2026-04-25}], summary='Primera prueba del MCP del equipo'."*

- [ ] Devuelve `success: true` y path de la nota
- [ ] Aparece en `Reuniones/` de la vault
- [ ] `query_memory` en una segunda conversación la encuentra

## Bloque 7 — Ready

- [ ] Leí [`05-FLUJO-TRABAJO.md`](05-FLUJO-TRABAJO.md) — conozco las 20+ tools del MCP y sus prompts
- [ ] Leí [`07-SKILLS.md`](07-SKILLS.md) — sé cuáles skills están disponibles
- [ ] Tengo linkeado el repo upstream para docs detalladas: <https://github.com/data-oilers/obsidian-vault-mcp>
- [ ] Tengo a mano [`06-TROUBLESHOOTING.md`](06-TROUBLESHOOTING.md) y [`FAQ.md`](FAQ.md)

---

**Si completaste todo**: estás listo. Avisá al equipo que estás operativo.

**Tiempo total esperado**: 75–90 min. Menos si ya tenías Node/git/Obsidian instalados de antes. La parte más larga suele ser editar `src/config.ts` con los paths correctos en Linux/Mac (el upstream trae paths Windows por default).
