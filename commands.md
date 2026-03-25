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
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
uv --version


git clone https://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@github.com/dsih-artpark/cif-digitisation-platform.git
cd cif-digitisation-platform

npm ci
uv sync --directory backend --frozen


cp example.env .env
nano .env


