# Start from the official Nginx image
FROM nginx:1.27.1-alpine

# Copy climsoft custom nginx.conf to the container's configuration directory
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the port that nginx will use
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]