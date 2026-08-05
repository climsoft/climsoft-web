"""
Creates the 'superset' database in PostgreSQL if it does not already exist.
Run before `superset db upgrade` so Alembic has a database to connect to.
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(
        host=os.environ.get("DB_HOST", "climsoft_db"),
        port=5432,
        user="postgres",
        password=os.environ.get("DB_PASSWORD", ""),
        database="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'superset'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE superset")
        print("[Superset] Created superset database.")
    else:
        print("[Superset] Superset database already exists.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"[Superset] Failed to ensure database: {e}", file=sys.stderr)
    sys.exit(1)
