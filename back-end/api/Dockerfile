# Stage 1: Build the application
FROM node:20.17.0 AS build-stage

WORKDIR /app

# Copy package.json and package-lock.json to install all dependencies
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:20.17.0 AS final-stage

WORKDIR /app

# Install production dependencies only
COPY package*.json ./

RUN npm install --production

# Copy built application from the builder stage
COPY --from=build-stage /app/dist ./dist

# Add an entrypoint script to dynamically save or check for environment variables
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose the port your NestJS app runs on
EXPOSE 3000

# Set the entrypoint and command to run the application in production
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "start:prod"]

