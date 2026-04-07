from __future__ import annotations

from fastapi import Request

from ..core.security import require_auth0_roles


def ensure_digitize_access(request: Request) -> set[str]:
    return require_auth0_roles(request, {"admin", "flw"})
