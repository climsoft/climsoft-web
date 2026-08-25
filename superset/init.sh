#!/bin/bash
set -e

echo "[Superset] Ensuring superset database exists..."
python3 /app/ensure_superset_db.py

echo "[Superset] Running database migrations..."
superset db upgrade

echo "[Superset] Creating admin user..."
superset fab create-admin \
    --username "${ADMIN_USERNAME:-admin}" \
    --firstname "Admin" \
    --lastname "Admin" \
    --email "admin@climsoft.org" \
    --password "${ADMIN_PASSWORD:-admin}" 2>/dev/null || echo "[Superset] Admin user already exists."

echo "[Superset] Creating API service account..."
superset fab create-admin \
    --username "${SERVICE_USERNAME:-climsoft_service}" \
    --firstname "Climsoft" \
    --lastname "Service" \
    --email "service@climsoft.org" \
    --password "${SERVICE_PASSWORD:-climsoft_service}" 2>/dev/null || echo "[Superset] Service account already exists."

echo "[Superset] Initialising roles and permissions..."
superset init

echo "[Superset] Registering Climsoft database connection and virtual datasets..."
python3 /app/init_datasets.py

if compgen -G "/app/products/*.zip" > /dev/null 2>&1; then
    echo "[Superset] Importing climate products..."
    for zip in /app/products/*.zip; do
        superset import-dashboards -p "$zip" --overwrite
        echo "[Superset] Imported: $(basename "$zip")"
    done
else
    echo "[Superset] No climate products to import."
fi

echo "[Superset] Initialisation complete."
