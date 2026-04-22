from fastapi import APIRouter

from .endpoints import digitize, frontend, geo, results

api_router = APIRouter()
api_router.include_router(digitize.router)
api_router.include_router(geo.router)
api_router.include_router(results.router)
api_router.include_router(frontend.router)
