#!/bin/bash
set -e

exec celery --app=superset.tasks.celery_app:app beat \
    --pidfile /tmp/celerybeat.pid \
    --schedule /tmp/celerybeat-schedule
