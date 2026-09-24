#!/usr/bin/env bash
# Shallow-clone the two upstream skill repositories into a persistent cache.
# Usage: bash scripts/clone-repos.sh [--force]

set -euo pipefail

CACHE_ROOT="/home/workdir/.grok/skills-cache"
FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

mkdir -p "$CACHE_ROOT"

clone_or_update() {
  local name="$1"
  local url="$2"
  local dest="$CACHE_ROOT/$name"

  if [[ -d "$dest/.git" ]]; then
    if $FORCE; then
      echo "Force-refreshing $name..."
      rm -rf "$dest"
    else
      echo "Updating existing $name..."
      git -C "$dest" pull --ff-only || {
        echo "Pull failed; re-cloning $name..."
        rm -rf "$dest"
      }
    fi
  fi

  if [[ ! -d "$dest/.git" ]]; then
    echo "Cloning $name (shallow)..."
    git clone --depth 1 --single-branch "$url" "$dest"
  fi

  echo "Ready: $dest"
  echo "  HEAD: $(git -C "$dest" rev-parse --short HEAD) $(git -C "$dest" log -1 --format=%s)"
}

clone_or_update "superpowers" "https://github.com/obra/superpowers.git"
clone_or_update "anthropic-skills" "https://github.com/anthropics/skills.git"

echo ""
echo "Both repositories are available under $CACHE_ROOT"
echo "  superpowers/     → Superpowers methodology + skill library + plugins"
echo "  anthropic-skills/ → Anthropic example skills + Agent Skills spec + template"
