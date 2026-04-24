# <NOMBRE-REPO>

> Template para `<repo>/CLAUDE.md`. Editá las secciones con los valores del repo concreto. Este archivo SE VERSIONA — se comparte con todo el equipo.

## Qué es este repo

<1–3 líneas describiendo propósito, dominio, stack principal>

## Stack

- Lenguaje: <Python 3.11 / TypeScript / Go / …>
- Framework: <FastAPI / Next.js / …>
- Infra: <GCP / AWS / …>
- DB: <Postgres / Redis / …>
- CI: GitHub Actions (`.github/workflows/`)

## Estructura clave

```
<repo>/
├── src/ o app/           # <qué vive acá>
├── scripts/              # scripts de mantenimiento y migraciones
├── tests/                # <integration | unit | e2e>
├── .github/workflows/    # CI y CD
└── docs/                 # README técnicos locales (no reemplaza la vault)
```

## Vault de documentación

La documentación canónica (specs, decisiones, postmortems) vive en:
```
~/Documentos/PROYECTOS/dataoilers-vault-org/<nombre-repo>/
```

Ver convención global en `~/.claude/CLAUDE.md`.

## Comandos útiles

```bash
# setup
<comando-install-deps>

# desarrollo
<comando-dev>

# tests
<comando-tests>

# lint
<comando-lint>

# build
<comando-build>
```

## Convenciones del repo

- **Branches**: `feat/...`, `fix/...`, `chore/...`, `docs/...`
- **Base branch**: `<develop | main>`
- **Promoción a stage/prod**: <describir flujo>
- **Secretos**: nunca en el código. Usar <Secret Manager / Vault / .env local>.

## Gotchas / cosas que NO hay que hacer

- <ej: "no correr migrations directo en prod, siempre por CD">
- <ej: "no tocar `terraform/backend/` sin coordinar con el equipo">
- <ej: "el MCP obsidian-vault necesita que la subvault esté clonada antes de abrir Claude acá">

## Contactos

- Owner del repo: <nombre>
- Canal Slack/Teams: <#canal>
