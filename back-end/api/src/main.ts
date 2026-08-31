import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfig } from './app.config';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Every controller route lives under /api (e.g. /api/users, not /users).
  // nginx's /api/ location forwards the path through unchanged to match —
  // no rewrite needed there, since this is the single source of truth for
  // the prefix rather than something nginx has to reconstruct on its own.
  app.setGlobalPrefix('api');

  //------------------------------------------------------

  app.enableCors({
    // TODO. Investigate how API can be made to allow CORSs.
    origin: (origin: any, callback: any) => {
      callback(null, true); // Allow the request
    },
    credentials: true
  });
  //------------------------------------------------------

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
