import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError(err => {
if (err.status === 401 && !req.url.includes('/Authentication/login')) {
  auth.logout();
  router.navigate(['/login']);
}

      if (err.status === 403) {
        router.navigate(['/forbidden']);
      }

      return throwError(() => err);
    })
  );
};