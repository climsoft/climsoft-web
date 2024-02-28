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
4. Run `docker-compose` inside the downloaded/cloned folder. This will download the `PostgreSql` and `NestJS` application dependencies. It will also start the 2 application instances as docker containers:
```bash
 docker-compose -f docker-compose.dev.yaml up
``` 
5. Run `npm install` inside the front-end/pwa of the downloaded/cloned folder. This will download the Angular application dependencies :
```bash
 npm install
```
6. Run `ng serve` inside the front-end/pwa of the downloaded/cloned folder. This will start the angular development server:
```bash
 ng serve
```
7. Navigate to `http://localhost:4200/`.


