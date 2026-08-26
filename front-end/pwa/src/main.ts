import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Bootstrap the Angular app
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

