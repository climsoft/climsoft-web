"""
Creates the 'superset' database in PostgreSQL if it does not already exist.
Also creates a read-only 'climsoft_reader' role used by Superset's dataset connection.
Run before `superset db upgrade` so Alembic has a database to connect to.
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

DB_HOST = os.environ.get("DB_HOST", "climsoft_db")
DB_NAME = os.environ.get("DB_NAME", "climsoft")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
READER_PASSWORD = os.environ.get("CLIMSOFT_READER_PASSWORD", "")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=5432,
        user="postgres",
        password=DB_PASSWORD,
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

    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'climsoft_reader'")
    if not cur.fetchone():
        cur.execute("CREATE ROLE climsoft_reader WITH LOGIN PASSWORD %s", (READER_PASSWORD,))
        print("[Superset] Created climsoft_reader role.")
    else:
        cur.execute("ALTER ROLE climsoft_reader WITH PASSWORD %s", (READER_PASSWORD,))
        print("[Superset] climsoft_reader role already exists.")

    cur.close()
    conn.close()
except Exception as e:
    print(f"[Superset] Failed to ensure database: {e}", file=sys.stderr)
    sys.exit(1)

# Grant read-only access on the climsoft database.
# GRANT ON ALL TABLES covers tables that already exist; ALTER DEFAULT PRIVILEGES
# covers tables created by the postgres role in the future (e.g. new migrations).
try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=5432,
        user="postgres",
        password=DB_PASSWORD,
        database=DB_NAME,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute(f"GRANT CONNECT ON DATABASE {DB_NAME} TO climsoft_reader")
    cur.execute("GRANT USAGE ON SCHEMA public TO climsoft_reader")
    cur.execute("GRANT SELECT ON ALL TABLES IN SCHEMA public TO climsoft_reader")
    cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO climsoft_reader")
    print("[Superset] Granted read-only access to climsoft_reader.")

    cur.close()
    conn.close()
except Exception as e:
    print(f"[Superset] Failed to grant read-only access: {e}", file=sys.stderr)
    sys.exit(1)
