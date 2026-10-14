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
import { provideAppInitializer, inject } from '@angular/core';
import { of, catchError } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { PermissionService } from './core/services/permission.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: false
    }
  }
}),
    provideHttpClient(withInterceptors([authInterceptor,errorInterceptor])),
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
  
  
  
  provideAppInitializer(() => {
  const auth = inject(AuthService);
  const perms = inject(PermissionService);
  return auth.isLoggedIn()
    ? perms.load().pipe(catchError(() => of(null)))
    : of(null);
}),
  
  
  
  
  
  
  ],
};