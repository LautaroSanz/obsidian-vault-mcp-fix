#!/usr/bin/env bash
# install-skills.sh — Clona skill packs recomendados en ~/.claude/skills/.
# Idempotente: si el repo ya está clonado, hace git pull.
#
# Uso:
#   ./install-skills.sh              # set --dev (default)
#   ./install-skills.sh --minimal    # solo esenciales
#   ./install-skills.sh --dev        # esenciales + dev
#   ./install-skills.sh --all        # todo

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

SET="${1:---dev}"

SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"

# name::repo-url
MINIMAL=(
  "obsidian-skills::https://github.com/kepano/obsidian-skills.git"
  "skills::https://github.com/anthropics/skills.git"
)

DEV=(
  "${MINIMAL[@]}"
  "superpowers::https://github.com/obra/superpowers.git"
  "claude-skills::https://github.com/jezweb/claude-skills.git"
  "agent-skills::https://github.com/vercel-labs/agent-skills.git"
)

ALL=(
  "${DEV[@]}"
  "marketingskills::https://github.com/coreyhaines31/marketingskills.git"
  "youtube-skills::https://github.com/ZeroPointRepo/youtube-skills.git"
  "awesome-claude-skills::https://github.com/ComposioHQ/awesome-claude-skills.git"
)

case "$SET" in
  --minimal) LIST=("${MINIMAL[@]}"); LABEL="minimal (2 packs)" ;;
  --dev)     LIST=("${DEV[@]}");     LABEL="dev (5 packs)" ;;
  --all)     LIST=("${ALL[@]}");     LABEL="all (8 packs)" ;;
  -h|--help)
    grep '^#' "$0" | sed 's|^# \?||'
    exit 0
    ;;
  *)
    err "Set desconocido: $SET. Usá --minimal, --dev, --all."
    exit 1
    ;;
esac

sec "Instalando set: $LABEL"
echo "Destino: $SKILLS_DIR"

for entry in "${LIST[@]}"; do
  NAME="${entry%%::*}"
  URL="${entry##*::}"
  DEST="$SKILLS_DIR/$NAME"

  if [[ -d "$DEST/.git" ]]; then
    log "[$NAME] ya clonado. Pull."
    git -C "$DEST" pull --ff-only --quiet 2>/dev/null \
      || warn "[$NAME] pull falló (branch divergente o local cambios)"
  else
    if [[ -e "$DEST" ]]; then
      warn "[$NAME] existe pero no es git repo. Skipping — resolvé manualmente."
      continue
    fi
    log "[$NAME] clonando…"
    if git clone --depth 1 "$URL" "$DEST" --quiet 2>/dev/null; then
      log "[$NAME] OK"
    else
      err "[$NAME] falló el clone desde $URL"
    fi
  fi
done

sec "Listo"
echo
echo "Skills instaladas:"
ls -1 "$SKILLS_DIR" | grep -v '^\.' | sed 's/^/  /'
echo
echo "Próximos pasos:"
echo "  1. Cerrá y reabrí Claude Code para que las skills se indexen."
echo "  2. Dentro de Claude, probá /help para ver las nuevas skills."
echo "  3. Actualizarlas en el futuro: re-ejecutar este script."
