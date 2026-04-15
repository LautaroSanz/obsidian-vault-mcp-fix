# Configuración MCP Obsidian - Guía Completa

## Status Actual

El MCP está compilado y listo. Necesitas completar 3 pasos para conectarlo con Obsidian.

---

## Paso 1: Configurar Rutas de Vaults de Obsidian

### 1a. Encontrar tus vaults

Abre Obsidian y ve a Settings → About → Vault location para ver dónde están guardados.

Típicamente en Windows están en:
```
C:\Users\TuUsuario\Documentos\NombreVault
C:\Users\TuUsuario\AppData\Local\Obsidian\Data\...
O donde hayas configurado
```

### 1b. Actualizar config.ts

Edita `src/config.ts` y reemplaza las rutas en la sección `VAULTS`:

```typescript
export const VAULTS: Record<string, VaultConfig> = {
  FACULTAD: {
    name: "FACULTAD",
    path: "C:\\Users\\TuUsuario\\Documentos\\FACULTAD",  // ACTUALIZAR ESTA RUTA
    hasGit: true,
  },
  DATAOILERS: {
    name: "DATAOILERS",
    path: "C:\\Users\\TuUsuario\\Documentos\\DATAOILERS",  // ACTUALIZAR ESTA RUTA
    hasGit: false,
  },
  PROYECTOS: {
    name: "PROYECTOS",
    path: "C:\\Users\\TuUsuario\\Documentos\\PROYECTOS",  // ACTUALIZAR ESTA RUTA
    hasGit: false,
  },
};
```

**Importante:** 
- Usa `\\` (doble backslash) en las rutas de Windows o usa `/` (forward slash)
- Las rutas DEBEN existir como carpetas reales en tu disco
- Si no tienes estos 3 vaults, elimina los que no uses y agrega los que sí

### 1c. Recompila

```bash
npm run build
```

Verifica que no haya errores TypeScript.

---

## Paso 2: Configurar GitHub Organization (Opcional)

Si quieres que el MCP auto-descubra repos desde tu org de GitHub:

### 2a. Crear GitHub Token

1. Ve a https://github.com/settings/personal-access-tokens/new
2. Scopes necesarios: `repo:read` + `org:read`
3. Copia el token

### 2b. Configurar variables de entorno

Opción A - Variables del sistema (Permanente):
```
Windows: Settings → Environment Variables
Variable: GITHUB_TOKEN
Value: ghp_xxxxx
Variable: GITHUB_ORG
Value: tu-organizacion
```

Opción B - Archivo .env local (Temporal, para testing):
```bash
cd D:\obsidian-vault-mcp
# Edita .env.local y completa:
GITHUB_ORG=tu-organizacion
GITHUB_TOKEN=ghp_xxxxx
```

### 2c. Verificar

Ejecuta:
```bash
npm run build
node dist/index.js
```

Si conecta correctamente a GitHub org, verás repos descubiertos al llamar a `list_repos`.

---

## Paso 3: Registrar MCP en Claude Code

### 3a. Abre Claude Code Settings

En Claude Code:
- Click en Settings (engranaje)
- Busca "MCP Servers" o "Model Context Protocol"

### 3b. Agrega nuevo server

Click "Add MCP Server" y completa:

```
Name: obsidian-vault-team-context
Type: StdIO
Command: node
Arguments: D:\obsidian-vault-mcp\dist\index.js
```

**Nota:** La ruta DEBE ser absoluta y DEBE apuntar a `dist/index.js`

### 3c. Reinicia Claude Code

Cierra y reabre Claude Code completamente para que cargue el servidor.

---

## Paso 4: Verifica la Conexión

En Claude Code, en una nueva conversación, intenta:

```
/mcp list
```

Deberías ver listado `obsidian-vault-team-context`.

Luego intenta una herramienta simple:

```
Tool: list_repos
```

Debería retornar JSON con repos (vacío si no configuraste GitHub).

---

## Checklist de Configuración

- [ ] Rutas de vaults actualizadas en `config.ts`
- [ ] `npm run build` sin errores
- [ ] MCP registrado en Claude Code
- [ ] Claude Code reiniciado
- [ ] `list_repos` retorna sin errores
- [ ] Puedo crear una reunión con `create_meeting_note`

---

## Test Completo

Una vez todo configurado, prueba esto en Claude Code:

```
Herramienta: create_meeting_note
Inputs:
  vault: FACULTAD
  date: 2026-04-15
  title: Test Reunion
  participants: [Alice, Bob]
  decisions: 
    - Use OAuth2
  actionItems:
    - task: Implement OAuth2
      owner: Alice
      dueDate: 2026-04-20
  summary: Testing the MCP connection
```

Debería crear una nota en tu vault FACULTAD en la carpeta `Reuniones/`.

---

## Troubleshooting

### Error: "Vault no encontrado"
- Verifica que la ruta en `config.ts` existe realmente
- Usa `C:\...` con barras invertidas escapadas: `C:\\...`

### Error: "MCP not found"
- Reinicia Claude Code
- Verifica la ruta en el MCP server config
- Abre terminal y prueba: `node D:\obsidian-vault-mcp\dist\index.js`

### Error: "Repositorio no encontrado"
- Si usas repos, asegúrate que GITHUB_TOKEN está configurado
- O configura repos locales manualmente en `config.ts`

### Las herramientas no aparecen
- Abre Developer Tools en Claude Code (F12)
- Busca mensajes de error en la consola
- Verifica que dist/index.js existe y es ejecutable

---

## Próximos Pasos

Una vez que todo funcione:

1. Lee `TOOLS.md` para ver qué herramientas tienes disponibles
2. Lee `EXAMPLES.md` para casos de uso reales
3. Crea tu primer meeting note y prueba linking automático
4. Prueba `advanced_search` para encontrar decisiones

¡Listo para usar Phase 2!
