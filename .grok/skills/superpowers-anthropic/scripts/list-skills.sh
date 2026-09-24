#!/usr/bin/env bash
# List skills available in the cached upstream repos.
# Usage: bash scripts/list-skills.sh [superpowers|anthropic|all]

set -euo pipefail

CACHE_ROOT="/home/workdir/.grok/skills-cache"
TARGET="${1:-all}"

if [[ ! -d "$CACHE_ROOT/superpowers" || ! -d "$CACHE_ROOT/anthropic-skills" ]]; then
  echo "Cache missing. Run: bash $(dirname "$0")/clone-repos.sh"
  exit 1
fi

list_dir() {
  local label="$1"
  local path="$2"
  echo "=== $label ==="
  if [[ -d "$path" ]]; then
    find "$path" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
  else
    echo "(not found)"
  fi
  echo
}

case "$TARGET" in
  superpowers|sp)
    list_dir "Superpowers skills" "$CACHE_ROOT/superpowers/skills"
    ;;
  anthropic|ant)
    list_dir "Anthropic skills" "$CACHE_ROOT/anthropic-skills/skills"
    ;;
  all|*)
    list_dir "Superpowers skills" "$CACHE_ROOT/superpowers/skills"
    list_dir "Anthropic skills" "$CACHE_ROOT/anthropic-skills/skills"
    echo "Cache root: $CACHE_ROOT"
    ;;
esac
