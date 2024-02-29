# Climsoft-Web
Climsoft web application contains front end and back end application. The front end is built using Angular and the back end is built using NestJS and Postgresql.

## Development Deployment
Follow the below steps for deployment.

1. [Download](https://docs.docker.com/get-docker/) and [install](https://docs.docker.com/engine/install/) docker desktop.
2. Start the docker engine using the docker desktop application.
3. Clone the [repository](https://github.com/climsoft/climsoft-web.git) to your local machine:
 ```bash
   git clone https://github.com/climsoft/climsoft-web.git
```
4. Inside the downloaded/cloned folder, run the command below. This will download the `PostgreSql` docker image and start it as a docker container:
```bash
 docker-compose -f docker-compose.dev.yaml up
```
5. Inside the back-end/api of the downloaded/cloned folder, run the 2 commands below. This will download the NestJS application dependencies and then it will start the NestJS application:
```bash
 npm install
```
```bash
 nest start --watch
```
6. Run `npm install` Inside the front-end/pwa of the downloaded/cloned folder, run the 2 commands below. This will download the Angular application dependencies and it will start the angular application :
```bash
 npm install
```
```bash
 ng serve
```
7. Navigate to `http://localhost:4200/`.


## Testing Deployment
Follow the below steps for deployment.

1. [Download](https://docs.docker.com/get-docker/) and [install](https://docs.docker.com/engine/install/) docker desktop.
2. Start the docker engine using the docker desktop application.
3. Clone the [repository](https://github.com/climsoft/climsoft-web.git) to your local machine:
 ```bash
   git clone https://github.com/climsoft/climsoft-web.git
```
4. Run `docker-compose` inside the downloaded/cloned folder. This will download the `Angular`, `NestJS`, `PostgreSql` application dependencies. It will also start the 3 application instances as docker containers:
```bash
 docker-compose -f docker-compose.dev.yaml up
```
5. Navigate to `http://localhost:80/`.


