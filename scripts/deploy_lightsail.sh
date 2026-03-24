#!/usr/bin/env bash
set -euo pipefail

# Deploy script for this app on Lightsail.
# Run from project root after launch setup:
#   chmod +x scripts/deploy_lightsail.sh
#   ./scripts/deploy_lightsail.sh
#
# Then open:
#   http://<lightsail-public-ip>:8787

API_PORT="${API_PORT:-8787}"

if [[ ! -f "package.json" || ! -f "backend/pyproject.toml" ]]; then
  echo "Run this script from the project root."
  exit 1
fi

if [[ ! -f ".env" ]]; then
  if [[ -f "example.env" ]]; then
    cp example.env .env
    echo ".env created from example.env. Add OPENROUTER_API_KEY and run again."
  else
    echo ".env not found."
  fi
  exit 1
fi

export PATH="$HOME/.local/bin:$PATH"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm not found. Run: ./scripts/launch_lightsail.sh"
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv not found. Run: ./scripts/launch_lightsail.sh"
  exit 1
fi

echo "Installing project dependencies..."
npm ci
uv sync --directory backend --frozen

echo "Building frontend and starting backend..."
export API_PORT
exec npm run build:full
