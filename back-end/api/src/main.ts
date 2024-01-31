import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:4200' ,credentials: true});
  app.use(
    session({
      name: 'ssid',
      secret: 'my-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // set to 24 hours
        sameSite: false ,
        secure: false //TODO change this to true in production,
      }
    }),
  );

  await app.listen(3000);
}
bootstrap();
