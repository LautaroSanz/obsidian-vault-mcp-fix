# Quick Start - MCP Obsidian Team Context

El MCP está **100% listo para probar**. Sigue estos pasos:

> [!info] Onboarding para miembros nuevos del equipo
> Si estás configurando Claude Code + MCP + skills + vaults desde cero en tu máquina, hay un paquete de onboarding completo con scripts automatizados en [`onboarding/`](./onboarding/README.md). Cubre instalación end-to-end para Linux/Mac/Windows.

## Paso 1: Registrar en Claude Code (1 minuto)

1. Abre **Claude Code Settings**
2. Busca **"MCP Servers"** o **"Model Context Protocol"**
3. Click **"Add Server"** / **"+"**
4. Completa así:

```
Name:      obsidian-vault-team-context
Type:      StdIO (o similar)
Command:   node
Arguments: D:\obsidian-vault-mcp\dist\index.js
```

5. **Reinicia Claude Code completamente** (cierra y reabre)

## Paso 2: Verifica la conexión (30 segundos)

En una nueva conversación en Claude Code, escribe:

```
Tool: list_repos
```

Si funciona, verás JSON vacío `{ "total": 0, "repos": [] }` ← **ESTÁ BIEN**

## Paso 3: Prueba Phase 2 (Test Completo)

Copia esto en Claude Code:

```
Tool: create_meeting_note

Inputs:
  vault: FACULTAD
  date: 2026-04-15
  title: Test Decision Linking
  participants: [Alice, Bob]
  decisions: ["Usar OAuth2 con PKCE", "HTTP-only secure cookies"]
  actionItems:
    - task: Implementar OAuth2
      owner: Alice
      dueDate: 2026-04-20
    - task: Revisar implementación
      owner: Bob
      dueDate: 2026-04-22
  summary: Probando el sistema Phase 2 de linking de decisiones
  relatedRepos: []
```

**Esperado:** JSON con `success: true` y ruta de nota creada

**Nota:** La nota se crea en `C:\Users\riper\Documentos\FACULTAD\Reuniones\2026-04-15-test-decision-linking.md`

## Paso 4: Prueba búsqueda avanzada

Una vez que creaste la reunión anterior, ahora prueba:

```
Tool: advanced_search

Inputs:
  query: oauth pkce
  types: [meeting, decision]
  sort: relevance
  limit: 10
```

**Esperado:** Retorna la reunión que acabas de crear con relevance score

## Paso 5: Prueba timeline y impacto

Necesitas el `decisionId` de paso 3 (sale en el JSON). Luego:

```
Tool: get_decision_timeline

Inputs:
  decisionId: (el ID de arriba, algo como "meeting-1713180600000...")
```

**Esperado:** Timeline con la reunión que creaste

---

## Herramientas Disponibles Ahora

**Phase 1 (Obsidian + Git):**
- create_note, read_note, search_notes, append_to_note, update_note, list_subjects
- get_repo_context, get_file_history, get_commit_info, get_repo_stats, list_repos
- create_meeting_note, query_memory, get_team_context, list_action_items

**Phase 2 NUEVO (Linking + Búsqueda):**
- `auto_link_commits` - Detecta commits que implementan decisiones
- `link_commit_to_decision` - Linkea manualmente
- `link_action_item_to_commit` - Asocia action items con commits
- `get_decision_timeline` - Ver timeline de decisión
- `get_decision_impact` - Ver impacto de una decisión
- `mark_decision_complete` - Marcar como implementada
- `advanced_search` - Búsqueda avanzada con ranking

---

## Si algo falla

### "MCP not found / tool not found"
```bash
# Verifica que el server está corriendo
# Linux/Mac:
node ~/obsidian-vault-mcp/dist/index.js
# Windows:
node D:\obsidian-vault-mcp\dist\index.js
```
Si sale error, reporta el error exacto.

### "Vault no encontrado"
El default es `~/Documentos/<NAME>` (cross-platform). Si tus vaults están en otra ruta, overrideá con `VAULTS_<NAME>_PATH` en `.env` — ver CONFIGURACION-MCP.md § Paso 1b.

### "Error creando nota"
Verifica que la carpeta `Reuniones/` existe dentro del vault. El MCP la crea sola solo en algunos flujos — crearla a mano si falla.

---

## Configuración Personalizada

Si quieres agregar:
- **Tus repos Git:** env var `REPO_<NAME_UPPER>_PATH` en `.env`, o `src/config.ts` sección `REPOS`
- **Tus vaults:** env var `VAULTS_<NAME>_PATH` en `.env`, o `src/config.ts` sección `VAULTS`
- **GitHub org:** `GITHUB_TOKEN` y `GITHUB_ORG` en `.env`

Con env vars NO hace falta recompilar. Solo editar `.env` y reiniciar el MCP.
Si editás `src/config.ts`, sí hace falta: `npm run build` + reiniciar Claude Code.

---

**¿Listo? Comienza registrando el MCP en Claude Code. Avísame si hay errores.**
