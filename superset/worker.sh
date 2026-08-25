#!/bin/bash
set -e

exec celery --app=superset.tasks.celery_app:app worker \
    --pool=gevent \
    --concurrency="${CELERY_CONCURRENCY:-4}" \
    --max-tasks-per-child=128 \
    -Ofair
