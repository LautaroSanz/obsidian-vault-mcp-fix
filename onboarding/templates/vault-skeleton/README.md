# <NOMBRE-REPO> — Vault

Vault de documentación del repo [`<org>/<nombre-repo>`](https://github.com/<org>/<nombre-repo>).

Forma parte del meta repo [`dataoilers-vault-org`](https://github.com/<org>/dataoilers-vault-org) como git submodule.

## Estructura

- **`Specs/`** — RFCs, diseño de features, specs técnicas, auditorías.
- **`Decisiones/`** — ADRs (Architecture Decision Records): qué se decidió y por qué.
- **`Postmortems/`** — RCAs de incidentes, lecciones aprendidas.
- **`Referencias/`** — Runbooks, notas de onboarding, cheatsheets, docs externas anotadas.

## Convenciones

Ver `~/.claude/CLAUDE.md` del onboarding del equipo, sección "Documentación de proyectos en Obsidian". Resumen:

- Frontmatter estándar con `tags`, `fecha`, `estado`, `autor`, `proyecto`.
- Callouts de Obsidian para destacar: `> [!info]`, `> [!warning]`, `> [!danger]`, `> [!note]`, `> [!success]`.
- Wikilinks para cross-references entre documentos de la vault.
- Commits: `docs:`, `fix:`, `chore:`, `refactor:`.

## Cómo actualizar esta subvault

```bash
# editar archivos dentro de esta carpeta
git add .
git commit -m "docs: ..."
git push

# desde el meta repo, actualizar el puntero
cd ..
git add <nombre-repo>
git commit -m "chore: bump <nombre-repo> subvault"
git push
```
