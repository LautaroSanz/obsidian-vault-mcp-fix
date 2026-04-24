# 01 — Instalación

Requisitos antes de tocar configs: Claude Code instalado, Node 20+, Obsidian, git configurado con tu cuenta de la org.

## 1. Claude Code

Recomendado: instalación nativa (no npm global), se auto-actualiza.

### Linux / macOS
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
El binario queda en `~/.local/bin/claude`. Agregar esa ruta al PATH si no está.

### Windows
Descargar el instalador desde <https://claude.com/claude-code> (app oficial) y seguir el wizard.

### Verificar
```bash
claude --version
```

### Login
```bash
claude
```
Primera vez abre el navegador para autenticar con tu plan (Pro, Max, o API key). Para el equipo el plan **Max** rinde mucho para este tipo de uso.

> [!info] Plan compartido vs. individual
> Claude Code **no soporta seats compartidos en un mismo plan Max**. Cada persona del equipo necesita su propia cuenta + plan (o API key vía Bedrock/Vertex si preferís facturación centralizada).

## 2. Node.js (para MCP servers)

Los MCP servers se ejecutan con `npx` o `node`. Necesitás Node 20+.

### Instalar con nvm (recomendado)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# reabrir terminal
nvm install 22
nvm alias default 22
```

### Verificar
```bash
node --version   # v22.x
npm --version
```

## 3. Obsidian

### Linux
Flatpak (recomendado en distros modernas):
```bash
flatpak install flathub md.obsidian.Obsidian
```
O AppImage desde <https://obsidian.md/download>.

### macOS / Windows
Instalador desde <https://obsidian.md/download>.

### Plugins comunitarios a instalar dentro de Obsidian
Ajustes → Plugins de la comunidad → desactivar Modo Restringido → Browse. Buscar e instalar:

- **Dataview** (views dinámicas sobre frontmatter)
- **Templater** (templates avanzados)
- **Advanced Tables** (edición cómoda de tablas)
- **Git** (opcional pero recomendado — hace commit/pull/push desde Obsidian)

## 4. Git

```bash
git config --global user.name "Nombre Apellido"
git config --global user.email "tu.email@dataoilers.com"
```

Para que los repos privados de la org se claneen sin pedir password cada vez:

### Opción A — SSH (recomendada)
```bash
ssh-keygen -t ed25519 -C "tu.email@dataoilers.com"
cat ~/.ssh/id_ed25519.pub   # copiar y pegar en GitHub → Settings → SSH keys
```

### Opción B — HTTPS con token
Crear Personal Access Token en GitHub con scope `repo`, guardarlo en el credential manager local (`git-credential-manager` o equivalente).

## 5. GitHub CLI (opcional pero muy cómodo)

```bash
# Linux (Debian/Ubuntu)
sudo apt install gh
# macOS
brew install gh
# Windows
winget install --id GitHub.cli
```

Login:
```bash
gh auth login
```

Claude Code usa `gh` para PRs, issues, comments — tenerlo autenticado evita dolores.

## Checklist final

- [ ] `claude --version` funciona
- [ ] `node --version` ≥ 20
- [ ] Obsidian abre y anda
- [ ] `git clone git@github.com:<org>/<repo-privado>.git` funciona sin pedir password
- [ ] `gh auth status` dice que estás logueado

Listo → seguir con [`02-CONFIGURACION-CLAUDE.md`](02-CONFIGURACION-CLAUDE.md).
