# Stage 1: Build the Angular application
FROM node:20.17.0 AS build-stage

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies from the lockfile.
# `npm ci` requires package-lock.json to be in sync with package.json,
# never modifies the lockfile, and starts from a clean node_modules.
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Angular application for production
RUN npm run build

# Stage 2: Serve the Angular application using nginx
FROM nginx:1.27.1-alpine AS final-stage

# Copy built Angular files from the previous stage
COPY --from=build-stage /app/dist/pwa /usr/share/nginx/html

# Expose the port that nginx will use
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]