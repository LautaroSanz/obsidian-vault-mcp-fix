#!/usr/bin/env bash
# verify.sh — Smoke tests del setup. Imprime qué funciona y qué no.
# Exit 0 si todo OK, 1 si algo falla.

set -uo pipefail

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YLW=$'\033[1;33m'
BLU=$'\033[0;34m'
NC=$'\033[0m'

OK=0
FAIL=0
WARNS=0

pass() { printf "%s✓%s %s\n" "$GRN" "$NC" "$1"; OK=$((OK+1)); }
fail() { printf "%s✗%s %s\n" "$RED" "$NC" "$1" >&2; FAIL=$((FAIL+1)); }
warn() { printf "%s!%s %s\n" "$YLW" "$NC" "$1"; WARNS=$((WARNS+1)); }
sec()  { printf "\n%s━━ %s ━━%s\n" "$BLU" "$1" "$NC"; }

: "${MCP_DIR:=$HOME/obsidian-vault-mcp}"
: "${CLAUDE_DIR:=$HOME/.claude}"
: "${VAULT_DIR:=$HOME/Documentos/PROYECTOS/dataoilers-vault-org}"

# ───────────────────────────────────────────────────────
sec "1. Binarios"
# ───────────────────────────────────────────────────────

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    pass "node $(node --version)"
  else
    fail "node $(node --version) < v20. Instalá Node 20+"
  fi
else
  fail "node no está en PATH"
fi

command -v git    >/dev/null 2>&1 && pass "git $(git --version | awk '{print $3}')" || fail "git no está en PATH"
command -v claude >/dev/null 2>&1 && pass "claude $(claude --version 2>&1 | head -1)" || fail "claude no está en PATH"
command -v gh     >/dev/null 2>&1 && pass "gh $(gh --version | head -1 | awk '{print $3}')" || warn "gh CLI no instalado (opcional pero recomendado)"

# ───────────────────────────────────────────────────────
sec "2. Config de Claude"
# ───────────────────────────────────────────────────────

[[ -f "$CLAUDE_DIR/CLAUDE.md"     ]] && pass "$CLAUDE_DIR/CLAUDE.md existe"     || fail "$CLAUDE_DIR/CLAUDE.md FALTA — corré setup.sh"
[[ -f "$CLAUDE_DIR/settings.json" ]] && pass "$CLAUDE_DIR/settings.json existe" || fail "$CLAUDE_DIR/settings.json FALTA — corré setup.sh"

if [[ -f "$CLAUDE_DIR/settings.json" ]]; then
  if node -e "JSON.parse(require('fs').readFileSync('$CLAUDE_DIR/settings.json','utf-8'))" 2>/dev/null; then
    pass "settings.json es JSON válido"
  else
    fail "settings.json NO es JSON válido"
  fi
fi

# ───────────────────────────────────────────────────────
sec "3. obsidian-vault-mcp"
# ───────────────────────────────────────────────────────

if [[ -d "$MCP_DIR" ]]; then
  pass "MCP clonado en $MCP_DIR"
  if [[ -d "$MCP_DIR/.git" ]]; then
    REMOTE_URL=$(git -C "$MCP_DIR" remote get-url origin 2>/dev/null || echo "")
    if [[ "$REMOTE_URL" == *"data-oilers/obsidian-vault-mcp"* ]]; then
      pass "remote origin es data-oilers/obsidian-vault-mcp"
    else
      warn "remote origin NO es data-oilers/obsidian-vault-mcp (es: $REMOTE_URL)"
    fi
  fi
else
  fail "MCP no clonado en $MCP_DIR — corré setup.sh"
fi

MCP_ENTRY="$MCP_DIR/dist/index.js"
if [[ -f "$MCP_ENTRY" ]]; then
  pass "MCP compilado ($MCP_ENTRY)"
else
  fail "MCP no compilado. Hacé: cd $MCP_DIR && npm install && npm run build"
fi

# .env check
MCP_ENV="$MCP_DIR/.env"
if [[ -f "$MCP_ENV" ]]; then
  pass ".env existe"
  if grep -qE "^GITHUB_TOKEN=ghp_" "$MCP_ENV"; then
    pass "GITHUB_TOKEN seteado en .env"
  else
    warn "GITHUB_TOKEN no seteado o es placeholder. Tools de git no van a funcionar."
  fi
  if grep -qE "^GITHUB_ORG=[a-z0-9-]+$" "$MCP_ENV" && ! grep -qE "^GITHUB_ORG=(your-organization-name|your-org-name)$" "$MCP_ENV"; then
    pass "GITHUB_ORG seteado en .env"
  else
    warn "GITHUB_ORG no seteado o todavía es placeholder."
  fi
else
  warn "$MCP_ENV no existe. Copiá .env.example a .env y completá."
fi

# Smoke: arrancar MCP, esperar que no crashee antes de 2s con stdin EOF
if [[ -f "$MCP_ENTRY" ]]; then
  TMP_LOG=$(mktemp)
  if timeout 2 node "$MCP_ENTRY" </dev/null >/dev/null 2>"$TMP_LOG"; then
    pass "MCP arranca sin crash"
  else
    RC=$?
    if [[ $RC -eq 124 ]]; then
      pass "MCP arranca y queda esperando stdin (OK)"
    else
      fail "MCP crasheó al arrancar (rc=$RC). Log:"
      sed 's/^/    /' "$TMP_LOG" >&2
    fi
  fi
  rm -f "$TMP_LOG"
fi

# ───────────────────────────────────────────────────────
sec "4. Meta vault"
# ───────────────────────────────────────────────────────

if [[ -d "$VAULT_DIR/.git" ]]; then
  pass "Meta vault clonado en $VAULT_DIR"

  REMOTE_URL=$(git -C "$VAULT_DIR" remote get-url origin 2>/dev/null || echo "")
  [[ -n "$REMOTE_URL" ]] && pass "remote origin: $REMOTE_URL" || warn "Meta vault sin remote origin"

  SUBMOD_COUNT=$(git -C "$VAULT_DIR" submodule status 2>/dev/null | wc -l)
  if [[ "$SUBMOD_COUNT" -gt 0 ]]; then
    pass "Submodules presentes: $SUBMOD_COUNT"
    while read -r line; do
      STATUS_CHAR="${line:0:1}"
      SUB=$(echo "$line" | awk '{print $2}')
      case "$STATUS_CHAR" in
        " ") pass "  submodule OK: $SUB" ;;
        "-") warn "  submodule NO inicializado: $SUB — hacé: git submodule update --init $SUB" ;;
        "+") warn "  submodule con commit ≠ pineado: $SUB" ;;
        "U") fail "  submodule con conflicto de merge: $SUB" ;;
      esac
    done < <(git -C "$VAULT_DIR" submodule status)
  else
    warn "Meta vault sin submodules (normal si es recién creado)"
  fi
else
  warn "Meta vault NO clonado. El repo todavía no existe en la org — esperable."
fi

# ───────────────────────────────────────────────────────
sec "5. Plugins Claude"
# ───────────────────────────────────────────────────────

PLUGINS_FILE="$CLAUDE_DIR/plugins/installed_plugins.json"
if [[ -f "$PLUGINS_FILE" ]]; then
  if grep -q "claude-mem" "$PLUGINS_FILE"; then
    pass "plugin claude-mem instalado"
  else
    warn "plugin claude-mem NO instalado. Dentro de Claude: /plugin install claude-mem@thedotmack"
  fi
else
  warn "No se encontró $PLUGINS_FILE. Abrí Claude al menos una vez para inicializarlo."
fi

# ───────────────────────────────────────────────────────
sec "Resumen"
# ───────────────────────────────────────────────────────

printf "  %sOK: %d%s   %sWarn: %d%s   %sFail: %d%s\n\n" "$GRN" "$OK" "$NC" "$YLW" "$WARNS" "$NC" "$RED" "$FAIL" "$NC"

if [[ $FAIL -eq 0 ]]; then
  printf "%s✓ Setup funcional.%s Podés arrancar a usar Claude con el MCP del equipo.\n" "$GRN" "$NC"
  exit 0
else
  printf "%s✗ Hay %d fallo(s).%s Corregilos o mirá 06-TROUBLESHOOTING.md.\n" "$RED" "$FAIL" "$NC"
  exit 1
fi
