import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ 
    origin: 'http://localhost:4200', // TODO. Set this from environment
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

  app.use(
    session({
      name: 'ssid',
      secret: 'climsoft-secret',// TODO. Set this from environment
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // set to 24 hours
        sameSite: false,
        secure: false //TODO set to true only when using HTTPS
      },
    }),
  );

  await app.listen(3000);
}

bootstrap();
