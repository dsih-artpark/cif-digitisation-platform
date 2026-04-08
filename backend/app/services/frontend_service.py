from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from ..core.config import (
    FRONTEND_BUILD_LOCK,
    FRONTEND_DIR,
    FRONTEND_DIST_DIR,
    FRONTEND_INDEX_FILE,
    FRONTEND_PUBLIC_DIR,
    FRONTEND_SOURCE_DIR,
)
from ..core.logging import logger


def latest_modified_time(*paths: Path) -> float:
    latest = 0.0
    for path in paths:
        if not path.exists():
            continue
        if path.is_file():
            latest = max(latest, path.stat().st_mtime)
            continue
        for child in path.rglob("*"):
            if child.is_file():
                latest = max(latest, child.stat().st_mtime)
    return latest


def frontend_build_is_stale() -> bool:
    if not FRONTEND_INDEX_FILE.exists():
        return True

    env_dir = FRONTEND_DIR.parent
    source_last_modified = latest_modified_time(
        FRONTEND_SOURCE_DIR,
        FRONTEND_PUBLIC_DIR,
        FRONTEND_DIR / "index.html",
        FRONTEND_DIR / "package.json",
        FRONTEND_DIR / "package-lock.json",
        FRONTEND_DIR / "vite.config.js",
        env_dir / ".env",
        env_dir / ".env.local",
        env_dir / ".env.development",
        env_dir / ".env.production",
    )
    dist_last_modified = latest_modified_time(FRONTEND_DIST_DIR)
    return source_last_modified > dist_last_modified


def get_npm_command() -> str | None:
    if os.name == "nt":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm")
        if npm_path:
            return npm_path

        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        fallback = Path(program_files) / "nodejs" / "npm.cmd"
        if fallback.exists():
            return str(fallback)
        return None

    return shutil.which("npm")


def ensure_frontend_build() -> None:
    if not frontend_build_is_stale():
        return

    with FRONTEND_BUILD_LOCK:
        if not frontend_build_is_stale():
            return

        npm_command = get_npm_command()
        if not npm_command:
            raise RuntimeError(
                "Frontend source is newer than dist, but npm is not available on PATH."
            )

        logger.info(
            "Frontend source changed. Rebuilding the frontend bundle before serving requests."
        )
        try:
            subprocess.run(
                [npm_command, "run", "build"],
                cwd=FRONTEND_DIR,
                check=True,
                text=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as exc:
            logger.error("Frontend build failed.\nstdout:\n%s\nstderr:\n%s", exc.stdout, exc.stderr)
            raise RuntimeError(
                "Frontend build failed. Fix the Vite build and refresh the page."
            ) from exc

        logger.info("Frontend bundle is up to date.")
