#!/usr/bin/env bash
# setup.sh — Bootstrap de Claude Code + obsidian-vault-mcp + meta vault para DataOilers.
# Idempotente: re-ejecutable sin romper nada. Hace backup antes de sobrescribir.
#
# Variables de entorno (opcionales, todas con default):
#   MCP_REPO       URL del repo obsidian-vault-mcp (default: data-oilers upstream)
#   MCP_DIR        destino local del MCP  (default: ~/obsidian-vault-mcp)
#   VAULT_REPO    URL del meta vault (aún no existe — dejá vacío para saltear)
#   VAULT_DIR      destino local del vault (default: ~/Documentos/PROYECTOS/dataoilers-vault-org)
#
# Uso:
#   ./setup.sh
#   VAULT_REPO=git@github.com:data-oilers/dataoilers-vault-org.git ./setup.sh

set -euo pipefail

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YLW=$'\033[1;33m'
BLU=$'\033[0;34m'
NC=$'\033[0m'

log()  { printf "%s✓%s %s\n" "$GRN" "$NC" "$1"; }
warn() { printf "%s!%s %s\n" "$YLW" "$NC" "$1"; }
err()  { printf "%s✗%s %s\n" "$RED" "$NC" "$1" >&2; }
sec()  { printf "\n%s━━ %s ━━%s\n" "$BLU" "$1" "$NC"; }
ask()  { printf "%s?%s %s " "$YLW" "$NC" "$1"; read -r REPLY; }

: "${MCP_REPO:=https://github.com/data-oilers/obsidian-vault-mcp.git}"
: "${MCP_DIR:=$HOME/obsidian-vault-mcp}"
: "${VAULT_REPO:=}"
: "${VAULT_DIR:=$HOME/Documentos/PROYECTOS/dataoilers-vault-org}"
: "${CLAUDE_DIR:=$HOME/.claude}"

ONBOARDING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat <<EOF
╔═══════════════════════════════════════════════════════════╗
║  DataOilers — Setup de Claude Code + obsidian-vault-mcp   ║
╚═══════════════════════════════════════════════════════════╝

Config efectiva:
  MCP_REPO          = ${MCP_REPO}
  MCP_DIR           = ${MCP_DIR}
  VAULT_REPO        = ${VAULT_REPO:-<(no configurado — meta vault todavía no existe)>}
  VAULT_DIR         = ${VAULT_DIR}
  CLAUDE_DIR        = ${CLAUDE_DIR}
  ONBOARDING_DIR    = ${ONBOARDING_DIR}

EOF

# ───────────────────────────────────────────────────────
sec "1. Pre-requisitos"
# ───────────────────────────────────────────────────────

check_bin() {
  if command -v "$1" >/dev/null 2>&1; then
    log "$1 disponible ($(${1} --version 2>&1 | head -1))"
  else
    err "$1 no está instalado. Ver 01-INSTALACION.md"
    exit 1
  fi
}
check_bin node
check_bin git

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  err "Node $NODE_MAJOR < 20. Instalá Node 20+ (recomendado: nvm install 22)"
  exit 1
fi

check_bin claude

# ───────────────────────────────────────────────────────
sec "2. Clonar/actualizar obsidian-vault-mcp"
# ───────────────────────────────────────────────────────

if [[ -d "$MCP_DIR/.git" ]]; then
  log "$MCP_DIR ya existe. Pull."
  git -C "$MCP_DIR" pull --rebase --autostash
else
  ask "Clonar obsidian-vault-mcp desde ${MCP_REPO} a ${MCP_DIR}? [y/N]"
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    git clone "$MCP_REPO" "$MCP_DIR"
  else
    err "Cancelado. Cloná manualmente y re-ejecutá."
    exit 1
  fi
fi

pushd "$MCP_DIR" >/dev/null
log "Instalando dependencias npm…"
npm install --silent --no-progress
log "Compilando TypeScript…"
npm run build --silent
[[ -f "$MCP_DIR/dist/index.js" ]] && log "Build OK → $MCP_DIR/dist/index.js" || { err "Build falló"; exit 1; }

# Copiar .env.example → .env si no existe
if [[ -f "$MCP_DIR/.env.example" && ! -f "$MCP_DIR/.env" ]]; then
  cp "$MCP_DIR/.env.example" "$MCP_DIR/.env"
  log ".env creado desde .env.example"
  warn "EDITALO: completá GITHUB_TOKEN y GITHUB_ORG en $MCP_DIR/.env"
elif [[ -f "$MCP_DIR/.env" ]]; then
  log ".env ya existe. No toco."
else
  warn "No encontré .env.example en $MCP_DIR — chequeá el repo."
fi
popd >/dev/null

# ───────────────────────────────────────────────────────
sec "3. Config global de Claude Code"
# ───────────────────────────────────────────────────────

mkdir -p "$CLAUDE_DIR"

backup_if_exists() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local bk="${f}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$f" "$bk"
    log "Backup: $bk"
  fi
}

copy_template() {
  local name="$1"
  local src="$ONBOARDING_DIR/templates/$name"
  local dst="$CLAUDE_DIR/$name"

  if [[ ! -f "$src" ]]; then
    err "No existe el template $src"
    return
  fi

  if [[ -f "$dst" ]]; then
    if cmp -s "$src" "$dst"; then
      log "$name ya idéntico al template. OK."
      return
    fi
    ask "$dst difiere del template. ¿Sobrescribir? [y/N]"
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
      warn "$name conservado. Revisá manualmente."
      return
    fi
    backup_if_exists "$dst"
  fi
  cp "$src" "$dst"
  log "Copiado: $name → $dst"
}

copy_template CLAUDE.md
copy_template settings.json

# ───────────────────────────────────────────────────────
sec "4. Meta vault (dataoilers-vault-org)"
# ───────────────────────────────────────────────────────

if [[ -z "$VAULT_REPO" ]]; then
  warn "VAULT_REPO no configurado. El meta vault todavía no existe como repo en la org."
  warn "Cuando esté listo, re-ejecutá: VAULT_REPO=<url> ./setup.sh"
elif [[ -d "$VAULT_DIR/.git" ]]; then
  log "$VAULT_DIR ya existe. Pull + submodule update."
  git -C "$VAULT_DIR" pull --rebase --autostash
  git -C "$VAULT_DIR" submodule update --init --recursive --remote --merge
else
  ask "Clonar meta vault desde ${VAULT_REPO}? [y/N]"
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    mkdir -p "$(dirname "$VAULT_DIR")"
    git clone --recurse-submodules "$VAULT_REPO" "$VAULT_DIR" \
      && log "Meta vault clonado en $VAULT_DIR" \
      || warn "Fallo el clone. ¿Repo existe? ¿SSH configurado?"
  else
    warn "Meta vault NO clonado."
  fi
fi

# ───────────────────────────────────────────────────────
sec "5. Próximos pasos MANUALES"
# ───────────────────────────────────────────────────────

cat <<EOF

Setup automático listo. Pendientes que no puedo hacer por vos:

  [ ] Editar ${MCP_DIR}/.env
      Completá GITHUB_TOKEN (crear en github.com/settings/personal-access-tokens)
      y GITHUB_ORG=data-oilers.

  [ ] Editar ${MCP_DIR}/src/config.ts
      Sección VAULTS: reemplazá los paths hardcoded (Windows) por los de tu máquina.
      Ver 03-MCP-Y-PLUGINS.md § 1.c para ejemplos Linux/Mac/Windows.
      Después: cd ${MCP_DIR} && npm run build

  [ ] Instalar Obsidian (ver 01-INSTALACION.md)
      Y abrirlo como "Open folder as vault" → ${VAULT_DIR} (cuando exista).

  [ ] Para cada repo de código donde vayas a usar Claude:
      cp ${ONBOARDING_DIR}/templates/mcp.json <repo>/.mcp.json
      # editar args si tu MCP_DIR difiere del default ~/obsidian-vault-mcp

  [ ] gh auth login  (si todavía no lo hiciste)

  [ ] Opcional: GitHub MCP oficial — agregar GITHUB_PERSONAL_ACCESS_TOKEN
      a ~/.claude.json (ver 03-MCP-Y-PLUGINS.md § 2)

  [ ] Skills: ./install-skills.sh --dev

Verificá que todo quedó OK:
  ./verify.sh

EOF

log "Setup completo."
