import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ValidationPipe } from '@nestjs/common';
import { StringUtils } from './shared/utils/string.utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.enableCors({ 
  //   // TODO. Investigate how CORS should be correctly set up to ensure support for different deployment options and security.
  //   //origin:  process.env.WEB_APP_BASE_URLs ? process.env.WEB_APP_BASE_URLs : 'http://localhost:4200' , 
  //   origin:  '*' , 
  //   credentials: true 
  // });

  const allowedOrigins: string[] = [];

  //const y = 'http://localhost:4200, https://example.com'
  //allowedOrigins.push(...StringUtils.mapCommaSeparatedStringToStringArray(y.toString()) );

  if (process.env.WEB_APP_ALLOWED_ORIGINS) {
    allowedOrigins.push(...StringUtils.mapCommaSeparatedStringToStringArray(process.env.WEB_APP_ALLOWED_ORIGINS.toString()));
  } else {
    allowedOrigins.push('http://localhost:4200');
  }

  console.log('allowedOrigins', allowedOrigins)

  app.enableCors({
    // TODO. Investigate how CORS should be correctly set up to ensure support for different deployment options and security.
    //origin:  process.env.WEB_APP_BASE_URLs ? process.env.WEB_APP_BASE_URLs : 'http://localhost:4200' , 
    origin: (origin, callback) => {
      // Allow requests with no `Origin` (e.g., from desktop and mobile apps)
      // Only allows requests from trusted web app origins. This is needed because web browsers require it
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS'));
      }
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

  console.log('session secrets', process.env.SESSION_SECRET ? process.env.SESSION_SECRET : 'climsoft_secret',)
  app.use(
    session({
      name: 'ssid',
      secret: process.env.SESSION_SECRET ? process.env.SESSION_SECRET : 'climsoft_secret',
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
