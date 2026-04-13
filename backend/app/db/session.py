from __future__ import annotations

import re
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.config import DATABASE_URL, PROJECT_ROOT
from .base import Base


def resolve_database_url(database_url: str) -> str:
    if not database_url.startswith("sqlite:///"):
        return database_url

    raw_path = database_url[len("sqlite:///") :].split("?", 1)[0]
    if raw_path in {"", ":memory:"}:
        return database_url

    path = Path(raw_path)
    if re.match(r"^/[A-Za-z]:/", raw_path):
        path = Path(raw_path[1:])

    if not path.is_absolute():
        path = (PROJECT_ROOT / path).resolve()

    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path.as_posix()}"


RESOLVED_DATABASE_URL = resolve_database_url(DATABASE_URL)

engine = create_engine(
    RESOLVED_DATABASE_URL,
    connect_args={"check_same_thread": False} if RESOLVED_DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
