#!/bin/sh

# Define the path to the config.json file
CONFIG_FILE="/usr/share/nginx/html/assets/config.json"

# Ensure the directory exists
if ! mkdir -p "$(dirname "$CONFIG_FILE")"; then
  echo "Error: Failed to create directory for $CONFIG_FILE" >&2
  exit 1
fi

# Check if the required environment variables are set
if [ -z "$HOST_IP_ADDRESS" ] || [ -z "$HOST_HTTP_PORT" ]; then
  echo "Error: Environment variables HOST_IP_ADDRESS and HOST_HTTP_PORT must be set." >&2
  exit 1
fi

# Generate the config.json file using the environment variables
cat <<EOF > "$CONFIG_FILE"
{
  "apiBaseUrl": "http://${HOST_IP_ADDRESS}:${HOST_HTTP_PORT}/api"
}
EOF

# Check if the file was created successfully
if [ $? -ne 0 ]; then
  echo "Error: Failed to create $CONFIG_FILE" >&2
  exit 1
fi

# Log the created config.json file contents
echo "Config file generated at $CONFIG_FILE:"
cat "$CONFIG_FILE"

# Pass control to the main process (e.g., Nginx)
exec "$@"