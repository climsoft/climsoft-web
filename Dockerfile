# Start from the official Nginx image
FROM nginx:1.27.1-alpine

# nginx.conf references ${SUPERSET_HOSTNAME} (see its own comments for why
# Superset needs its own hostname/origin). Copy it as a .template and point
# the base image's own envsubst-on-templates entrypoint script (part of the
# official nginx image, runs automatically before CMD) at it directly, so it
# substitutes env vars into place at container start and writes the result
# back to nginx's real config path — no custom entrypoint needed here.
COPY nginx.conf /etc/nginx/nginx.conf.template

# The base image's own nginx entrypoint script defaults to reading *.template files from
# /etc/nginx/templates/ and writing the substituted output into
# /etc/nginx/conf.d/ (a layout meant for a base nginx.conf that does
# `include /etc/nginx/conf.d/*.conf;`). This repo instead keeps everything
# in one flat nginx.conf, so both are redirected to /etc/nginx itself: the
# template above is found in place, and the output is written back out as
# /etc/nginx/nginx.conf — the exact path nginx reads on startup — with no
# templates/ or conf.d/ subdirectories involved at all.
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

# Expose the port that nginx will use
EXPOSE 80

# Run nginx
# Same command as the base image's own default CMD — restated explicitly to match
CMD ["nginx", "-g", "daemon off;"]