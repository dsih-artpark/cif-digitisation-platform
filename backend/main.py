import os
from pathlib import Path

import uvicorn

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RELOAD_DIRS = [str(PROJECT_ROOT / "backend"), str(PROJECT_ROOT / "frontend")]
RELOAD_PATTERNS = ["*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.css", "*.html"]


def run_server(port: int) -> None:
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=RELOAD_DIRS,
        reload_includes=RELOAD_PATTERNS,
        access_log=True,
    )


def main() -> None:
    port = int(os.getenv("API_PORT", "8787"))
    run_server(port)


if __name__ == "__main__":
    main()
