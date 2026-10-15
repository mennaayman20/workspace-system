import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError(err => {
      // 401: التوكن منتهي أو غير صالح (نستثني request اللوجين نفسه)
      if (err.status === 401 && !req.url.includes('/Authentication/login')) {
        auth.logout();
        router.navigate(['/login']);
      }

      // 403: نعرض رسالة بس من غير ما نطرد اليوزر من الصفحة
      if (err.status === 403) {
        snackBar.open('ليس لديك صلاحية لتنفيذ هذا الإجراء', 'إغلاق', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          direction: 'rtl',
        });
      }

      return throwError(() => err);
    })
  );
};