from app.api.health import router as health_router
from app.api.internal import router as ops_router

__all__ = ["health_router", "ops_router"]
