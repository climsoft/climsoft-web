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
   Within the cloned repository directory, execute the following command to initialise the PostgreSQL container:
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

4. **Frontend Setup**:
   In the `front-end/pwa` directory, execute the following commands to install Angular dependencies and launch the development server:
   ```bash
   npm install
   ```
    ```bash
   ng serve
   ```

5. **Access the Application**:
   Open a web browser and go to `http://localhost:4200/` to view the application. Default

## Testing Deployment Guide
For testing deployment with Docker containers for PWA, API and PostgreSQL, follow these steps:

### Prerequisites
- Make sure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Activate the Docker engine using the Docker Desktop application.
- Ensure Git is [downloaded](https://git-scm.com/) and installed on your machine.
- For CI/CD(continuous integration and development) workflows, we recommend using [GitHub Desktop](https://desktop.github.com/) to pull latest changes.
- Use Windows Powershell (5.1 and above) to execute the commands outlined.

### Setup
1. **Clone the Repository**:
   Clone Climsoft Web to your machine:
   ```bash
   git clone https://github.com/climsoft/climsoft-web.git
   ```

2. **Initialise Containers**:
   Within the cloned repository directory, execute the following command to build and initialise the PWA, API and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.test.yaml up --build
   ```
   Note, the application will use the `.env` to to set the required environment variables.

3. **Access the Application**:
   Navigate to `http://localhost:8080/` in your web browser to interact with the application.
   Default username is `admin@climsoft.org` and default password is `climsoft@admin!2`

5. **Stopping the Application**:
   Press `Ctrl + C` or execute the following command to stop the PWA, API and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.test.yaml down
   ```

## Production Deployment Guide For Windows
For production deployment with Docker containers for PWA, API and PostgreSQL, follow these steps:

### Prerequisites
- Make sure Docker Desktop is [downloaded](https://docs.docker.com/get-docker/) and [installed](https://docs.docker.com/engine/install/) on your machine.
- Activate the Docker engine using the Docker Desktop application.
- You can use Windows Powershell (5.1 and above) or docker desktop terminal to execute the commands outlined. 

### Setup   
1. **Install and Initialse Application**:
   Using your terminal commands to navigate to the directory of your choice and within the directory execute the following commands to download the latest [docker-compose.prod.yaml](https://github.com/climsoft/climsoft-web/releases/download/v1.0.0-latest/docker-compose.prod.yaml) file and initialise the PWA, API and PostgreSQL containers:
   ```bash
   Invoke-WebRequest -Uri https://github.com/climsoft/climsoft-web/releases/download/v1.0.0-latest/docker-compose.prod.yaml -OutFile "docker-compose.prod.yaml"
   $Env:HOST_IP_ADDRESS = Read-Host -Prompt "Enter host IP address"
   $Env:HOST_HTTP_PORT = Read-Host -Prompt "Enter host HTTP port"
   $Env:HOST_DB_PASSWORD = Read-Host -Prompt "Enter database password"
   docker-compose -f docker-compose.prod.yaml up
   ```
   For local access to the application you can use `localhost` as your host IP address and `8080` as your host http port number.

2. **Access the Application**:
   Navigate to `http://HOST_IP_ADDRESS:HOST_HTTP_PORT/` (Replace `HOST_IP_ADDRESS` and `HOST_HTTP_PORT` with what you entered when prompted) in your web browser to interact with the application.
   Default username is `admin@climsoft.org` and default password is `climsoft@admin!2`

3. **Stopping the Application**:
   Press `Ctrl + C` or execute the following command to stop the PWA, API and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.prod.yaml down
   ```

## Production Deployment Guide For Linux
For production deployment with Docker containers for PWA, API and PostgreSQL, follow these steps:

### Prerequisites
- Make sure Docker Engine and Docker Compose is downloaded and installed on your machine.
- Activate the Docker engine.
- You can use Windows Powershell (5.1 and above) or docker desktop terminal to execute the commands outlined. 

### Setup   
1. **Install and Initialse Application**:
   Using your terminal commands to navigate to the directory of your choice and within the directory execute the following commands to download the latest [docker-compose.prod.yaml](https://github.com/climsoft/climsoft-web/releases/download/v1.0.0-latest/docker-compose.prod.yaml) file and initialise the PWA, API and PostgreSQL containers:
   ```bash
   wget "https://github.com/climsoft/climsoft-web/releases/download/v1.0.0-latest/docker-compose.prod.yaml" -O "docker-compose.prod.yaml"
   read -p "Enter host IP address: " HOST_IP_ADDRESS
   read -p "Enter host HTTP port: " HOST_HTTP_PORT
   read -sp "Enter database Password: " DB_PASSWORD
   echo
   docker-compose -f docker-compose.prod.yaml up
   ```
   For local access to the application you can use `localhost` as your host IP address and `8080` as your host http port number.

2. **Access the Application**:
   Navigate to `http://HOST_IP_ADDRESS:HOST_HTTP_PORT/` (Replace `HOST_IP_ADDRESS` and `HOST_HTTP_PORT` with what you entered when prompted) in your web browser to interact with the application.
   Default username is `admin@climsoft.org` and default password is `climsoft@admin!2`

3. **Stopping the Application**:
   Press `Ctrl + C` or execute the following command to stop the PWA, API and PostgreSQL containers:
   ```bash
   docker-compose -f docker-compose.prod.yaml down
   ```
