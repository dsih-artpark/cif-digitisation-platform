from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

import jwt
from fastapi import HTTPException, Request
from jwt import InvalidTokenError, PyJWKClient

from .config import AUTH0_AUDIENCE, AUTH0_DOMAIN, AUTH0_ENABLED, AUTH0_ISSUER, AUTH0_ROLE_CLAIM


@lru_cache(maxsize=1)
def get_auth0_jwks_client() -> PyJWKClient:
    return PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")


def normalize_auth0_roles(raw_roles: Any) -> list[str]:
    if isinstance(raw_roles, list):
        return [str(role).strip().lower() for role in raw_roles if str(role).strip()]
    if isinstance(raw_roles, str) and raw_roles.strip():
        return [role for role in re.split(r"[\s,;|]+", raw_roles.strip().lower()) if role]
    return []


def extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "").strip()
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def decode_auth0_token(token: str) -> dict[str, Any]:
    signing_key = get_auth0_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE,
        issuer=AUTH0_ISSUER,
    )


def require_auth0_roles(request: Request, allowed_roles: set[str]) -> set[str]:
    if not AUTH0_ENABLED:
        return set()

    token = extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    try:
        payload = decode_auth0_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from exc

    roles = set(normalize_auth0_roles(payload.get(AUTH0_ROLE_CLAIM, [])))
    if not roles:
        raise HTTPException(status_code=403, detail="No authorized CIF role was found.")

    if roles.isdisjoint(allowed_roles):
        raise HTTPException(status_code=403, detail="You do not have access to this resource.")

    return roles
