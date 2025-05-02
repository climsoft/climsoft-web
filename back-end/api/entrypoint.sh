#!/bin/sh

# File to save environment variables
ENV_FILE="/etc/container_env_vars.env"

# List of required environment variables
REQUIRED_VARS="DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD FIRST_INSTALL V4_SAVE V4_IMPORT V4_DB_HOST V4_DB_PORT V4_DB_NAME V4_DB_USERNAME V4_DB_PASSWORD V4_DB_UTCOFFSET"

# Check if environment variables are passed by the user
env_updated=false
for var in $REQUIRED_VARS; do
  eval "value=\$$var"  # Indirect expansion replacement
  if [ -n "$value" ]; then
    env_updated=true
    break
  fi
done

# If any variable is passed, save the relevant variables to the file
if [ "$env_updated" = true ]; then
  echo "Environment variables passed by user. Saving to $ENV_FILE..."
  printenv | grep -E "^($(echo $REQUIRED_VARS | sed 's/ /|/g'))=" > "$ENV_FILE"
else
  # If no variables are passed, and the ENV_FILE exists, load the variables from the file
  if [ -f "$ENV_FILE" ]; then
    echo "No environment variables passed. Loading from $ENV_FILE..."
    while IFS= read -r line; do
      var_name=$(echo "$line" | cut -d '=' -f 1)
      eval "value=\$$var_name"  # Indirect expansion replacement
      if [ -z "$value" ]; then
        export "$line"
      fi
    done < "$ENV_FILE"
  else
    # If the file is missing, exit with an error message.
    echo "No environment variables passed and no saved file found. Exiting." >&2
    exit 1
  fi
fi

# Inline check for missing required variables
missing_vars=""
for var in $REQUIRED_VARS; do
  eval "value=\$$var"  # Indirect expansion replacement
  if [ -z "$value" ]; then
    missing_vars="$missing_vars $var"
  fi
done

if [ -n "$missing_vars" ]; then
  echo "Error: Missing required environment variables:$missing_vars" >&2
  exit 1
fi

# TODO. Don't echo password
# Debug: Print environment variables to verify
echo "Loaded environment variables:"
printenv | grep -E "^($(echo $REQUIRED_VARS | sed 's/ /|/g'))="

# Pass control to the main process
exec "$@"