#!/bin/sh

# Define the path to the config.json file
CONFIG_FILE=/usr/share/nginx/html/assets/config.json

# Ensure the directory exists
mkdir -p $(dirname "$CONFIG_FILE")

# Generate the config.json file using the environment variable
cat <<EOF > $CONFIG_FILE
{
  "apiBaseUrl": "${API_BASE_URL}"
}
EOF

# Log the created config.json file contents
echo "Config file generated at $CONFIG_FILE:"
cat $CONFIG_FILE

# Pass control to the main process (e.g. Nginx)
exec "$@" 