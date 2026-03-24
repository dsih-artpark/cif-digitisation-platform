#!/usr/bin/env bash
set -euo pipefail

# Launch setup script for Ubuntu-based AWS Lightsail instance.
# Installs Python, Node.js, and uv.
#
# Usage:
#   chmod +x scripts/launch_lightsail.sh
#   ./scripts/launch_lightsail.sh

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run this script as a normal user with sudo access (do not run as root)."
  exit 1
fi

echo "Installing system packages (python + node prerequisites)..."
sudo apt-get update -y
sudo apt-get install -y \
  ca-certificates \
  curl \
  git \
  gnupg \
  python3 \
  python3-pip \
  python3-venv

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

export PATH="$HOME/.local/bin:$PATH"

echo "Setup complete."
echo "Versions:"
python3 --version
node --version
npm --version
uv --version
