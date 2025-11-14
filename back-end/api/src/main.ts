import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfig } from './app.config';
import * as session from 'express-session';
import * as pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // TODO. Code below is meant to be an implementation of allowed origins for enforcing CORS security measures 
  // const allowedOrigins: string[] = [];
  // if (process.env.WEB_APP_ALLOWED_ORIGINS) {
  //   allowedOrigins.push(...StringUtils.mapCommaSeparatedStringToStringArray(process.env.WEB_APP_ALLOWED_ORIGINS.toString()));
  // } else {
  //   allowedOrigins.push('http://localhost:4200');
  // }


  app.enableCors({
    // TODO. Investigate how CORS should be correctly set up to ensure support for different deployment options and security.
    // origin:  process.env.WEB_APP_BASE_URLs ? process.env.WEB_APP_BASE_URLs : 'http://localhost:4200' , 
    origin: (origin, callback) => {
      //console.log(`Client Origin - ${origin}`); 

      // TODO. In future implement CORs security feature to enable users to determine origin setting based on their security requirements.
      callback(null, true); // Allow the request


      // TODO Code below is meant to enfors allowed origins
      // Allow requests with no `Origin` (e.g., from desktop and mobile apps)
      // Only allows requests from trusted web app origins. This is needed because web browsers require it
      // if (!origin || allowedOrigins.includes(origin)) {
      //   callback(null, true); // Allow the request
      // } else {
      //   console.error(`Origin ${origin} NOT allowed by CORS`);
      //   callback(new Error(`Origin ${origin} NOT allowed by CORS`));
      // }
    },
    credentials: true
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const PgSession = pgSession(session);
  const pgPool = new Pool({
    user: AppConfig.dbCredentials.username,
    host: AppConfig.dbCredentials.host,
    database: AppConfig.dbCredentials.database,
    password: AppConfig.dbCredentials.password,
    port: AppConfig.dbCredentials.port,
  });

  app.use(
    session({
      store: new PgSession({
        pool: pgPool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
        pruneSessionInterval: 24 * 60 * 60,  // Set to 24 hours. Note this is given in seconds.
      }),
      secret: AppConfig.dbCredentials.password,
      resave: false,
      rolling: true, // Reset the session cookie expiration on every request
      saveUninitialized: false,
      cookie: {
        maxAge: 2 * 60 * 60 * 1000,  // Set to 2 hours. Note, this is given in milliseconds.
        secure: false, // TODO. Set to true only when using HTTPS.
      },
    }),
  );

  // Increase the allowed payload request from the default 100kb to 1MB
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Set the port to listen for connections
  await app.listen(3000);
}

bootstrap();
