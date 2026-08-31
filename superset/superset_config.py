import os
from urllib.parse import urlparse

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change_me")

APP_NAME = "Climsoft Web"
FAVICONS = [{"href": "/static/assets/images/climsoft_logo.png"}]

# APP_ICON is deprecated in Superset 5+. Use THEME_DEFAULT token instead.
# Set both light and dark themes so the logo persists regardless of user mode.
_BRAND_LOGO = {
    "brandLogoUrl": "/static/assets/images/climsoft_logo.png",
    "brandLogoAlt": "Climsoft Web",
    "brandLogoHref": "/",
    "brandLogoHeight": "40px",
}
THEME_DEFAULT = {"token": _BRAND_LOGO}
THEME_DARK = {"token": _BRAND_LOGO}

SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI")
if not SQLALCHEMY_DATABASE_URI:
    raise RuntimeError("SQLALCHEMY_DATABASE_URI environment variable is required")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

_redis = urlparse(REDIS_URL)

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": REDIS_URL,
}

DATA_CACHE_CONFIG = {
    **CACHE_CONFIG,
    "CACHE_KEY_PREFIX": "superset_data_",
}

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
}

# Grant the guest/public role the same dataset-viewing permissions as Gamma.
# Required for embedded dashboards — guests are assigned the Public role and
# need at least Gamma-level permissions to load dashboards and query datasets.
PUBLIC_ROLE_LIKE = "Gamma"

# Superset is reverse-proxied on its own hostname (see nginx.conf /
# nginx.dev.conf's SUPERSET_HOSTNAME server block), not a path prefix under
# a shared origin — Superset's own frontend emits absolute root-relative
# URLs (static assets, API calls, its embedded-dashboard route) that don't
# respect a path prefix, so path-prefix deployment isn't reliable (the
# Superset maintainers themselves recommend a subdomain instead:
# https://github.com/apache/superset/discussions/29547). Since Superset is
# mounted at the root of its own origin, no APPLICATION_ROOT / prefix config
# is needed at all.

# Required when running behind a reverse proxy so Superset trusts
# X-Forwarded-For / X-Forwarded-Proto headers from Nginx.
ENABLE_PROXY_FIX = True
PROXY_FIX_CONFIG = {
    "x_for": 1,
    "x_proto": 1,
    "x_host": 1,
}

# Allow Climsoft Angular to embed dashboards via iframe
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["*"],  # Restrict to Climsoft's domain in production
}

# Disable Talisman so Nginx controls security headers (including frame-ancestors)
TALISMAN_ENABLED = False
HTTP_HEADERS = {}

# Cookie settings for cross-origin iframe embedding.
# In production with HTTPS set SESSION_COOKIE_SECURE = True and
# SESSION_COOKIE_SAMESITE = "None".
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE_HTTPONLY = True

# Guest token settings (used for embedded mode)
GUEST_TOKEN_JWT_SECRET = SECRET_KEY
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 minutes — Angular must refresh before expiry

# Celery configuration for async queries, alerts, reports, and thumbnails
class CeleryConfig:
    broker_url = REDIS_URL
    imports = ("superset.sql_lab", "superset.tasks.scheduler")
    result_backend = REDIS_URL
    worker_prefetch_multiplier = 10
    task_acks_late = True
    task_annotations = {
        "sql_lab.get_sql_results": {"rate_limit": "100/s"},
    }

CELERY_CONFIG = CeleryConfig

# Store async SQL Lab query results in Redis
from cachelib.redis import RedisCache
RESULTS_BACKEND = RedisCache(
    host=_redis.hostname,
    port=_redis.port or 6379,
    db=int(_redis.path.lstrip("/") or 0),
    key_prefix="superset_results",
)
