# 04 — Estructura de Vaults

## Modelo

```
                    ┌─────────────────────────────┐
                    │  dataoilers-vault-org (git) │   ← se abre en Obsidian
                    │  (vault general / meta)     │     todos ven lo mismo
                    └──────────────┬──────────────┘
                                   │ git submodules
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼──────────┐    ┌─────────▼────────┐    ┌──────────▼────────┐
│ dataoilers-      │    │ dataoilers-      │    │ dataoilers-       │
│ vault-itmind-    │    │ vault-enterprise-│    │ vault-<otro-repo> │
│ infrastructure   │    │ ai-platform      │    │                   │
│ (git repo)       │    │ (git repo)       │    │ (git repo)        │
└──────────────────┘    └──────────────────┘    └───────────────────┘
        │                          │                          │
        │  ↕ editan specs,         │                          │
        │    decisiones,           │                          │
        │    postmortems           │                          │
        ▼                          ▼                          ▼
  editor + claude code      editor + claude code     editor + claude code
```

- **Cada repo de código** tiene una vault espejo privada: `dataoilers-vault-<nombre-repo>`.
- **La vault general** `dataoilers-vault-org` es otro repo que incluye las vaults por repo como **git submodules**.
- **Obsidian se abre sobre `dataoilers-vault-org`** — desde ahí ves todas las subvaults en una sola ventana, con wikilinks cruzados entre repos.
- **Claude Code puede apuntar a cualquiera**: en un repo de código usa la subvault del repo; en tareas transversales usa la vault general.

## Por qué submodules (y no subfolder simple)

- **Commits atómicos por repo**: si cambiás docs de `itmind-infrastructure`, el commit queda en `dataoilers-vault-itmind-infrastructure`, no mezcla con docs de otros repos.
- **Permisos granulares**: podés dar acceso al vault de un repo sin dar acceso a todos.
- **Historia clara**: `git log` en cada subvault cuenta la historia de ese repo sin ruido.
- **El meta repo solo trackea qué commit de cada subvault es el "canonical"**.

Trade-off: los submodules tienen algo de fricción (necesitás hacer `git submodule update --remote` para traer cambios). Lo resolvemos con un par de alias/scripts (ver más abajo).

## Estructura interna de cada subvault

```
dataoilers-vault-<repo>/
├── .obsidian/           # config de Obsidian (se versiona para que todos vean igual)
├── README.md            # qué contiene, links al repo de código
├── Specs/               # RFCs, diseño de features, specs técnicas
├── Decisiones/          # ADRs / decisiones de arquitectura
├── Postmortems/         # incidentes y RCAs
└── Referencias/         # runbooks, notas de onboarding, docs externas anotadas
```

Ver `templates/vault-skeleton/` en este paquete para copiar una estructura base.

## Convenciones de archivos

### Frontmatter estándar

Todo archivo markdown arranca con:

```yaml
---
tags: [spec, infraestructura, seguridad]      # tags para búsqueda y dataview
fecha: 2026-04-23                              # fecha ISO
estado: in-progress                            # in-progress | completado | deprecated | draft
autor: nombre.apellido                         # tu usuario git
proyecto: "[[ITMIND-INFRASTRUCTURE]]"          # wikilink al proyecto (vault-wide)
relacionado:                                   # wikilinks opcionales
  - "[[V-02]]"
  - "[[Q-V-03]]"
---
```

### Wikilinks

- Cross-references internas al vault: `[[V-02]]`, `[[Q-27]]`, `[[Postmortem 2026-03-15]]`.
- Links al repo de código: URL HTTP completa a GitHub.
- Entre subvaults: `[[dataoilers-vault-enterprise-ai-platform/Specs/M-01]]` (la ruta incluye el submódulo).

### Callouts de Obsidian

Usarlos para resaltar información crítica:

```markdown
> [!info] Metadata
> Fecha: 2026-04-23
> Owner: Lautaro

> [!warning] Gotcha
> El REMOTE_LOG_CONN_ID no debe estar seteado cuando Airflow usa ADC.

> [!danger] Acción urgente
> F-02 requiere scale-down antes del deploy

> [!success] Validado
> Smoke tests OK en QA

> [!note] Nota
> Pendiente confirmar con @franco
```

## Bootstrap inicial (lo hace una persona una sola vez)

### 1. Crear la vault general en GitHub
En la org, crear repo privado `dataoilers-vault-org`. Clonar:
```bash
git clone git@github.com:<org>/dataoilers-vault-org.git ~/Documentos/PROYECTOS/dataoilers-vault-org
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
```

### 2. Crear una subvault por cada repo de código
Por cada repo que querramos documentar, crear un repo privado `dataoilers-vault-<nombre>` en GitHub. Inicializarlo con la estructura skeleton:

```bash
# desde tu máquina
cp -r <onboarding>/templates/vault-skeleton /tmp/dataoilers-vault-<nombre>
cd /tmp/dataoilers-vault-<nombre>
git init -b main
git remote add origin git@github.com:<org>/dataoilers-vault-<nombre>.git
git add .
git commit -m "chore: bootstrap vault"
git push -u origin main
```

### 3. Agregar cada subvault como submodule del meta repo
```bash
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git submodule add git@github.com:<org>/dataoilers-vault-<nombre>.git <nombre>
git commit -m "chore: add <nombre> subvault as submodule"
git push
```

### 4. Commitear config de Obsidian
```bash
# abrí Obsidian, apuntale a ~/Documentos/PROYECTOS/dataoilers-vault-org como vault
# instalá plugins (Dataview, Git, Templater)
# cerrá Obsidian
git add .obsidian/
git commit -m "chore: commit obsidian config"
git push
```

## Onboarding de un nuevo compañero

Una vez que la vault general y las subvaults existen en GitHub:

```bash
# clonar el meta repo CON submodules
git clone --recurse-submodules git@github.com:<org>/dataoilers-vault-org.git \
  ~/Documentos/PROYECTOS/dataoilers-vault-org

# si olvidaste --recurse-submodules:
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git submodule update --init --recursive
```

Abrir Obsidian → "Open folder as vault" → seleccionar `~/Documentos/PROYECTOS/dataoilers-vault-org`.

Listo, ves todo.

## Cómo se actualiza el vault en el día a día

### Traer cambios de los compañeros
```bash
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git pull
git submodule update --remote --merge
```

### Hacer cambios y pushearlos
Editás un archivo dentro de `dataoilers-vault-org/itmind-infrastructure/Specs/nueva-feature.md`:

```bash
# commit en la subvault
cd ~/Documentos/PROYECTOS/dataoilers-vault-org/itmind-infrastructure
git add Specs/nueva-feature.md
git commit -m "docs: spec de nueva feature"
git push

# actualizar el pointer en el meta repo
cd ~/Documentos/PROYECTOS/dataoilers-vault-org
git add itmind-infrastructure
git commit -m "chore: bump itmind-infrastructure subvault"
git push
```

### Script helper (opcional)

Guardar como `~/bin/vault-sync.sh`:

```bash
#!/bin/bash
set -e
VAULT=~/Documentos/PROYECTOS/dataoilers-vault-org
cd "$VAULT"
git pull
git submodule update --remote --merge
echo "✓ Vault sincronizada"
```

Y para pushear todo:

```bash
#!/bin/bash
# ~/bin/vault-push.sh
set -e
VAULT=~/Documentos/PROYECTOS/dataoilers-vault-org
cd "$VAULT"
git submodule foreach 'git add -A && git diff --staged --quiet || git commit -m "docs: update" && git push'
git add .
git diff --staged --quiet || git commit -m "chore: bump submodules"
git push
echo "✓ Vault pusheada"
```

## Plugin Obsidian Git (atajo del flujo anterior)

Si instalás el plugin "Obsidian Git":
- **Backup at startup**: pull automático cuando abrís Obsidian
- **Auto-backup**: commit + push periódico de cambios
- Config: `Settings → Obsidian Git`

No maneja bien submodules de forma automática, pero sí los repos individuales. Útil para la subvault que edites más seguido.
