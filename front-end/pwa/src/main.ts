import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Bootstrap the Angular app.
// Event coalescing runs one change detection pass per DOM event instead of one per listener,
// which matters on pages with many controls listening to the same event (e.g. entry form grids).
platformBrowserDynamic().bootstrapModule(AppModule, { ngZoneEventCoalescing: true })
  .catch(err => console.error(err));

