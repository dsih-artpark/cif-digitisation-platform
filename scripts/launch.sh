#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/cif-digitisation-platform}"
APP_USER="${APP_USER:-$USER}"

sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git software-properties-common

# Python 3.12
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
python3 --version

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh
if ! grep -q 'PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.local/bin:$PATH"
uv --version

mkdir -p "$APP_DIR"

cat <<EOF
Server dependencies are installed.

Next steps:
1. Let GitHub Actions deploy the repository contents to $APP_DIR.
2. Create $APP_DIR/.env from example.env.
3. Re-run this script after the first deploy if you want it to install dependencies and build immediately.
EOF

if [[ -f "$APP_DIR/example.env" && ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/example.env" "$APP_DIR/.env"
fi

if [[ -f "$APP_DIR/backend/pyproject.toml" && -f "$APP_DIR/frontend/package.json" ]]; then
  cd "$APP_DIR"
  uv sync --directory backend --frozen
  cd frontend
  npm ci
  npm run build
  cd ..
fi

sudo tee /etc/systemd/system/cif-app.service > /dev/null <<EOF
[Unit]
Description=CIF Digitisation App
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=PATH=$HOME/.local/bin:/usr/bin:/bin
EnvironmentFile=$APP_DIR/.env
ExecStart=$HOME/.local/bin/uv run --directory $APP_DIR/backend python -m uvicorn app:app --host 0.0.0.0 --port 8787 --access-log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cif-app

if [[ -f "$APP_DIR/.env" && -f "$APP_DIR/backend/pyproject.toml" ]]; then
  sudo systemctl restart cif-app
  sudo systemctl status cif-app --no-pager
else
  echo "cif-app service created. Run it after the first CI deploy and .env setup are complete."
fi
