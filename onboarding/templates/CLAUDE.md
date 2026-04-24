# Convenciones globales — equipo DataOilers

> Este archivo se copia a `~/.claude/CLAUDE.md`. Aplica a todas las sesiones de Claude Code, en cualquier repo.

## Documentación de proyectos en Obsidian

Cada repo de la org tiene su propia **vault de Obsidian** como fuente canónica de documentación, sincronizada vía git privado. Todas las subvaults están agrupadas en una vault meta "general".

### Ubicación estándar

```
~/Documentos/PROYECTOS/dataoilers-vault-org/                 # vault general (meta repo)
~/Documentos/PROYECTOS/dataoilers-vault-org/<nombre-repo>/   # subvault por repo (git submodule)
```

La vault general es el repo `<org>/dataoilers-vault-org` en GitHub. Cada subvault es el repo `<org>/dataoilers-vault-<nombre-repo>`.

### Regla

Cuando trabajo en un repo de la org, cualquier **spec, decisión de arquitectura, migración, postmortem o documentación relevante** debe publicarse en la subvault correspondiente, no solo como comentario en PR o en el código.

### Mapeo repo → subvault

| Repo de código | Subvault |
|---|---|
| `itmind-infrastructure` | `dataoilers-vault-org/itmind-infrastructure/` |
| `enterprise-ai-platform` | `dataoilers-vault-org/enterprise-ai-platform/` |
| `<otros>` | `dataoilers-vault-org/<otros>/` |

### Convenciones dentro de cada subvault

- **Estructura fija**: `Specs/`, `Decisiones/`, `Postmortems/`, `Referencias/`
- **Frontmatter estándar** en cada archivo:
  ```yaml
  ---
  tags: [spec, infraestructura]
  fecha: YYYY-MM-DD
  estado: in-progress | completado | deprecated | draft
  autor: usuario.git
  proyecto: "[[NOMBRE-REPO]]"
  ---
  ```
- **Callouts de Obsidian** para destacar: `> [!info]`, `> [!warning]`, `> [!danger]`, `> [!note]`, `> [!success]`
- **Wikilinks** para cross-references: `[[V-02]]`, `[[Postmortem 2026-03-15]]`

### Antes de documentar

1. Verificar que existe la subvault en `~/Documentos/PROYECTOS/dataoilers-vault-org/<repo>/`.
2. Si no existe y el repo lo amerita, **avisar al usuario** antes de crearla (no crear silenciosamente).
3. Escribir con `Write` o con el MCP `obsidian-vault` (tools: `create_note`, `append_to_note`, `update_note`).
4. Al terminar una sesión de trabajo en un repo, recordarle al usuario si hay cambios en la subvault para commitear/pushear.

## Tono y estilo al trabajar

- Respuestas cortas y concretas. Si el usuario pide algo simple, respuesta simple.
- No agregar secciones "Summary" / "Changes made" al final de cada turno salvo que lo pidan.
- Antes de empezar tareas no triviales, proponer plan breve y esperar confirmación.
- Si hay ambigüedad real en el enunciado, preguntar antes de ejecutar — no asumir.

## Convenciones de código

- Commits en español, prefijos tipo `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- PRs con título corto (<70 chars) y body con Summary + Test plan.
- No commitear secretos ni archivos con tokens (`~/.claude.json`, `.env`).
- No usar `--no-verify`, `--force-push` a branches protegidas, ni `git reset --hard` sin aviso.
