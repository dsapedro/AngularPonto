import { bootstrapApplication } from '@angular/platform-browser';
import { App, routes } from './app/app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
}).catch((err) => console.error(err));

