# Climsoft-Web

## Overview
Climsoft Web is a comprehensive web application featuring both frontend and backend components. The frontend is developed with Angular, while the backend leverages NestJS and PostgreSQL for a robust, full-stack solution.

## Development Deployment Guide

To deploy the Climsoft Web application for development purposes, follow these steps:

### Prerequisites
- Ensure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Start the Docker engine via the Docker Desktop application.
- Ensure Node.js is [downloaded](https://nodejs.org/en) and installed on your machine.
- Ensure Git is [downloaded](https://git-scm.com/) and installed on your machine.
- For CI/CD(continuous integration and development) workflows, use [visual studio code](https://code.visualstudio.com/) to execute set up commands, pull and push latest changes.

### Setup
1. **Clone the Repository**:
   Execute the following command to Clone Climsoft Web to your local machine using the command:
   ```bash
   git clone https://github.com/climsoft/climsoft-web.git
   ```

2. **Start PostgreSQL**:
   Within the cloned repository directory, execute the following command to initialize the PostgreSQL container:
   ```bash
   docker-compose -f docker-compose.dev.yaml up
   ```

3. **Backend API Setup**:
   Navigate to `back-end/api` and run the commands below to install NestJS dependencies, launch the backend API with hot-reload enabled and execute seeding migration scripts:
   ```bash
   npm install
   ```
   ```bash
   nest start --watch
   ```
   ```bash
   npx typeorm migration:run -d dist/typeorm.config.js
   ```

4. **Frontend Setup**:
   In the `front-end/pwa` directory, execute the following commands to install Angular dependencies and launch the development server:
   ```bash
   npm install
   ```
    ```bash
   ng serve
   ```

5. **Access the Application**:
   Open a web browser and go to `http://localhost:4200/` to view the application.

## Testing Deployment Guide

For testing deployment with Docker containers for PWA, API and PostgreSQL, follow these steps:

### Prerequisites
- Make sure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Activate the Docker engine using the Docker Desktop application.
- Ensure Git is [downloaded](https://git-scm.com/) and installed on your machine.
- For CI/CD(continuous integration and development) workflows, we recommend using [GitHub Desktop](https://desktop.github.com/) to pull latest changes.

### Setup
1. **Clone the Repository**:
   Clone Climsoft Web to your machine:
   ```bash
   git clone https://github.com/climsoft/climsoft-web.git
   ```

2. **Initialize Containers**:
   Within the cloned repository directory, execute the following command to initialize the PWA, API and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.dev.yaml up
   ```

3. **Access the Application**:
   Navigate to `http://localhost:80/` in your web browser to interact with the application.
