import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ValidationPipe } from '@nestjs/common'; 

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


  // TODO. Do we need session secrets to come from environment variables. Removing that need can simplify the settings required.

  app.use(
    session({
      name: 'ssid',
      secret: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : 'climsoft_secret',
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
