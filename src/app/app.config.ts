import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura },
      // اختياري: لو عايز نصوص PrimeNG نفسها (زي Calendar) تتترجم، شوف الخطوة 4
    }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      lang: 'ar',
      fallbackLang: 'ar',
      loader: provideTranslateHttpLoader({
  prefix: '/i18n/',
  suffix: '.json',
  failOnError: true,
      }),
    }),
    provideToastr({
      positionClass: 'toast-bottom-left',
      timeOut: 1000,
      closeButton: true,
    }),
  ],
};