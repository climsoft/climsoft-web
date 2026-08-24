"""
Registers virtual datasets from superset/datasets/*.sql into Superset.
Run via the entrypoint before starting gunicorn (uses Superset's app context directly).
"""
import os
import sys

DATASETS_DIR = "/app/datasets"
DB_HOST = os.environ.get("DB_HOST", "climsoft_db")
DB_NAME = os.environ.get("DB_NAME", "climsoft")
READER_PASSWORD = os.environ.get("CLIMSOFT_READER_PASSWORD", "")
CLIMSOFT_DB_URI = f"postgresql://climsoft_reader:{READER_PASSWORD}@{DB_HOST}:5432/{DB_NAME}"


def main():
    sql_files = sorted(
        f for f in os.listdir(DATASETS_DIR) if f.endswith(".sql")
    ) if os.path.isdir(DATASETS_DIR) else []

    if not sql_files:
        print("[Superset] No SQL dataset files found, skipping.")
        return

    from superset import create_app
    from superset.extensions import db

    app = create_app()
    with app.app_context():
        from superset.models.core import Database
        from superset.connectors.sqla.models import SqlaTable

        # Ensure the Climsoft database connection exists in Superset
        climsoft_db = db.session.query(Database).filter_by(
            database_name="Climsoft"
        ).first()

        if not climsoft_db:
            climsoft_db = Database(
                database_name="Climsoft",
                sqlalchemy_uri=CLIMSOFT_DB_URI,
                expose_in_sqllab=True,
                allow_run_async=True,
                allow_dml=False,
            )
            db.session.add(climsoft_db)
            db.session.flush()
            print(f"[Superset] Registered Climsoft database connection.")
        else:
            print("[Superset] Climsoft database connection already registered.")

        for filename in sql_files:
            dataset_name = filename.replace(".sql", "")
            with open(os.path.join(DATASETS_DIR, filename)) as f:
                sql = f.read().strip()

            existing = db.session.query(SqlaTable).filter_by(
                table_name=dataset_name,
                database_id=climsoft_db.id,
            ).first()

            if existing:
                existing.sql = sql
                print(f"[Superset] Updated dataset: {dataset_name}")
            else:
                table = SqlaTable(
                    table_name=dataset_name,
                    sql=sql,
                    database_id=climsoft_db.id,
                    schema="public",
                    is_managed_externally=False,
                )
                db.session.add(table)
                print(f"[Superset] Created dataset: {dataset_name}")

        db.session.commit()


if __name__ == "__main__":
    main()
