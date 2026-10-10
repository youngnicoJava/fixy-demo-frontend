import { environment } from '../environments/environment';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
} from '@angular/core';

import { provideRouter, withInMemoryScrolling, withHashLocation } from '@angular/router';

import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';

import { demoInterceptor } from './demo/demo-store';
import { routes } from './app.routes';

registerLocaleData(localeEsAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      ...(environment.hashRouting ? [withHashLocation()] : []),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),

    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection(),

    {
      provide: LOCALE_ID,
      useValue: 'es-AR',
    },

    provideHttpClient(withInterceptors([demoInterceptor])),

    {
      provide: 'LEAFLET_EXCLUDE',
      useValue: true,
    },
  ],
};

