# Quick Start - MCP Obsidian Team Context

El MCP está **100% listo para probar**. Sigue estos pasos:

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
node D:\obsidian-vault-mcp\dist\index.js
```
Si sale error, reporta el error exacto.

### "Vault no encontrado"
Las rutas ya están configuradas correctamente en `C:\Users\riper\Documentos\`.

### "Error creando nota"
Verifica que la carpeta existe: `C:\Users\riper\Documentos\FACULTAD\Reuniones\`

---

## Configuración Personalizada

Si quieres agregar:
- **Tus repos Git:** Edita `src/config.ts`, sección `REPOS`
- **Tus vaults:** Edita `src/config.ts`, sección `VAULTS`
- **GitHub org:** Variables `GITHUB_TOKEN` y `GITHUB_ORG`

Luego: `npm run build` + reinicia Claude Code

---

**¿Listo? Comienza registrando el MCP en Claude Code. Avísame si hay errores.**
