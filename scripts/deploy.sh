#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-$HOME/cif-digitisation-platform}"
APP_DIR="${2:-$HOME/cif-digitisation-platform}"

export PATH="$HOME/.local/bin:$PATH"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y rsync
fi

mkdir -p "$APP_DIR"

rsync -a --delete \
  --exclude=".env" \
  --exclude=".git" \
  --exclude=".github" \
  --exclude="node_modules" \
  --exclude="frontend/node_modules" \
  --exclude=".venv" \
  --exclude="backend/.venv" \
  --exclude=".vite" \
  --exclude=".ruff_cache" \
  --exclude="__pycache__" \
  "$SOURCE_DIR"/ "$APP_DIR"/

cd "$APP_DIR"
uv sync --directory backend --frozen

sudo systemctl restart cif-app
sudo systemctl status cif-app --no-pager
