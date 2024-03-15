# Climsoft-Web

## Overview
Climsoft Web is a comprehensive web application featuring both frontend and backend components. The frontend is developed with Angular, while the backend leverages NestJS and PostgreSQL for a robust, full-stack solution.

## Development Deployment Guide

To deploy the Climsoft Web application for development purposes, follow these steps:

### Prerequisites
- Ensure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Start the Docker engine via the Docker Desktop application.
- Ensure Node.js is [downloaded](https://nodejs.org/en) and installed on your machine.

### Setup
1. **Clone the Repository**:
   Clone Climsoft Web to your local machine using the command:
   ```bash
   git clone https://github.com/climsoft/climsoft-web.git
   ```

2. **Start PostgreSQL**:
   Within the cloned repository directory, execute the following command to initialize the PostgreSQL container:
   ```bash
   docker-compose -f docker-compose.dev.yaml up
   ```

3. **Backend API Setup**:
   Navigate to `back-end/api` and run the commands below to install dependencies and start the NestJS backend with hot-reload enabled:
   ```bash
   npm install
   nest start --watch
   ```

4. **Frontend Setup**:
   In the `front-end/pwa` directory, execute the following commands to install Angular dependencies and launch the development server:
   ```bash
   npm install
   ng serve
   ```

5. **Access the Application**:
   Open a web browser and go to `http://localhost:4200/` to view the application.

## Testing Deployment Guide

For testing deployment with Docker containers for Angular, NestJS, and PostgreSQL, follow these steps:

### Prerequisites
- Make sure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Activate the Docker engine using the Docker Desktop application.

### Setup
1. **Clone the Repository**:
   Clone Climsoft Web to your machine:
   ```bash
   git clone https://github.com/climsoft/climsoft-web.git
   ```

2. **Initialize Containers**:
   Inside the cloned directory, use `docker-compose` to set up and start the Angular, NestJS, and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.dev.yaml up
   ```

3. **Access the Application**:
   Navigate to `http://localhost:80/` in your web browser to interact with the application.
