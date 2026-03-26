#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$HOME/cif-digitisation-platform"
BRANCH="${BRANCH:-main}"

export PATH="$HOME/.local/bin:$PATH"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  git clone https://github.com/dsih-artpark/cif-digitisation-platform.git "$REPO_DIR"
fi

cd "$REPO_DIR"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
uv sync --frozen
npm run build

sudo systemctl restart cif-app
sudo systemctl status cif-app --no-pager
