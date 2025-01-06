import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    // Attach the configuration to a global variable. 
    // This variable will be used by the AppConfig service to get all the application configuration settings
    (window as any).appConfig = config;

    // Bootstrap the Angular app
    platformBrowserDynamic().bootstrapModule(AppModule)
      .catch(err => console.error(err));
  });

