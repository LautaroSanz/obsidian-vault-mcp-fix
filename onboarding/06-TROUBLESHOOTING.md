# 06 — Troubleshooting

## Claude Code

### `claude: command not found`
El binario nativo vive en `~/.local/bin/claude`. Si no está en PATH:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc   # o ~/.zshrc
source ~/.bashrc
```

### `/mcp` muestra `obsidian-vault: failed`
Causas típicas:
1. **Path equivocado en `.mcp.json`** — `args` apunta a un `dist/index.js` que no existe.
2. **No hiciste `npm run build`** después de editar `src/config.ts` del MCP.
3. **El vault declarado en `config.ts` no existe en disco** — creá la carpeta o ajustá el path.
4. **Claude abrió antes de que terminaras el setup** — cerrá Claude, hacé `npm run build`, abrí de nuevo.

Para ver el error exacto:
```bash
cd ~/obsidian-mcp
node dist/index.js
# leer error en stdout, Ctrl+C para salir
```

### Claude pide permiso para cada comando trivial
El `defaultMode` en `~/.claude/settings.json` debería ser `"auto"`. Si no está:
```json
{
  "permissions": { "defaultMode": "auto" }
}
```

Para pre-autorizar patrones específicos, agregar a `~/.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(git status:*)",
      "Bash(npm run:*)"
    ]
  }
}
```

### `claude-mem` no aparece o no carga memoria
```bash
claude
/plugin list                          # ver si está instalado
/plugin install claude-mem@thedotmack # si no está
```

Si el plugin está instalado pero no trae memoria al abrir un repo, chequear que exista:
```bash
ls ~/.claude/projects/
```
La carpeta se nombra por el path encodeado del repo. Si la carpeta existe pero no hay `memory/`, la memoria se va generando durante la sesión — es normal en repos recién abiertos.

## MCP obsidian-vault

### "Vault <NOMBRE> no está configurado"
Significa que pediste crear/leer una nota en un vault que no está en `VAULTS` de `src/config.ts`. Agregalo y rebuildealo:
```bash
cd ~/obsidian-mcp
# editar src/config.ts agregando la entrada
# editar src/index.ts agregando el nombre al enum vaultEnum
npm run build
```
Reiniciar Claude.

### "Permission denied" al crear notas
El MCP corre con tu usuario. Si la vault está en un path con permisos de root:
```bash
sudo chown -R $USER:$USER ~/Documentos/PROYECTOS/dataoilers-vault-org
```

## Obsidian + Git

### Obsidian se cuelga al abrir
Suele ser un plugin comunitario problemático. Abrir en modo seguro:
- Ajustes → Plugins de la comunidad → desactivar todos → reiniciar → reactivar uno a uno.

### `git submodule update --remote` no trae cambios
El pointer del submodule en el meta repo está pineado a un commit viejo. El `--remote` debería traer el tip del branch configurado:
```bash
# ver qué branch trackea cada submódulo
git config -f .gitmodules --get-regexp branch
```
Si no hay branch configurado, por default trackea `master`/`main`. Setear explícitamente:
```bash
git submodule set-branch --branch main itmind-infrastructure
git commit -am "chore: set submodule branch"
```

### Conflictos de merge en markdown de la vault
- `git status` dentro de la subvault afectada.
- Editar el archivo, resolver manualmente (los `<<<<<<<` / `>>>>>>>` son markdown válido, Obsidian te los muestra, resolvelos ahí).
- `git add <archivo> && git commit`.

Si pasa seguido: activar el plugin de Obsidian "Obsidian Git" con auto-backup corto (cada 5 min) para reducir la ventana de divergencia.

### Al clonar el meta repo, las subvaults están vacías
Te olvidaste `--recurse-submodules`:
```bash
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git submodule update --init --recursive
```

## Permisos / accesos

### "Permission denied (publickey)" al clonar
Tu SSH key no está en GitHub. Ver sección "Git" de [`01-INSTALACION.md`](01-INSTALACION.md) o:
```bash
ssh -T git@github.com   # debería saludarte por nombre
```

### GitHub MCP devuelve 401
El `GITHUB_PERSONAL_ACCESS_TOKEN` en `~/.claude.json` está vencido o sin scope. Regenerá el token con scope `repo` y actualizá el JSON.

## Performance

### Claude se queda pensando mucho en sesiones largas
`/compact` — resume la conversación, libera contexto.
`/clear` — empieza de cero manteniendo `claude-mem` activo.

### MCP obsidian-vault tarda en responder
Si el vault tiene miles de notas, `search_notes` (que hace grep) puede tardar. Opciones:
- Pedir búsquedas más específicas (`search <query> en <subvault>`).
- Agregar un índice Dataview dentro de Obsidian para uso humano.

## Cuándo pedir ayuda

Antes de pingearme, chequeá:
1. `/mcp` y `/plugin list` — todo conectado?
2. `claude --version` — versión reciente?
3. `git status` en la vault — no hay cambios sin commitear que estén causando líos?
4. ¿El problema lo podés reproducir en un repo limpio?

Si después de eso sigue, abrir una nota en el vault general: `Referencias/Troubleshooting-Claude.md` con el stacktrace y el contexto, y pingear en el canal del equipo.
