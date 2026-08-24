FROM apache/superset:6.1.0

USER root

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright-browsers

RUN . /app/.venv/bin/activate && \
    uv pip install \
    psycopg2-binary \
    gevent \
    Authlib \
    openpyxl \
    Pillow \
    playwright \
    && playwright install-deps \
    && PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright-browsers playwright install chromium

# Bake in config and init scripts so the image works without a repo clone.
# In dev, volume mounts in docker-compose shadow these files for live editing.
COPY --chown=superset:superset superset_config.py /app/pythonpath/superset_config.py
COPY --chown=superset:superset init.sh /app/init.sh
COPY --chown=superset:superset worker.sh /app/worker.sh
COPY --chown=superset:superset beat.sh /app/beat.sh
RUN chmod +x /app/init.sh /app/worker.sh /app/beat.sh
COPY --chown=superset:superset ensure_superset_db.py /app/ensure_superset_db.py
COPY --chown=superset:superset init_datasets.py /app/init_datasets.py
COPY --chown=superset:superset datasets/ /app/datasets/
COPY --chown=superset:superset climsoft_logo.png /app/superset/static/assets/images/climsoft_logo.png
# TODO (Phase 6): Replace with COPY --chown=superset:superset products/ /app/products/ once shipped dashboard ZIPs are committed
RUN mkdir -p /app/products && chown superset:superset /app/products

USER superset
