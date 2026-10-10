import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/lang.service'; // عدّلي المسار حسب مكان الخدمة عندك

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const langService = inject(LanguageService);

  const token = authService.getToken();
  const currentLang = langService.currentLang();

  // تجهيز الـ Headers الأساسية التي ترسل دائماً
  const headers: Record<string, string> = {
    'Accept-Language': currentLang,
  };

  // إضافة التوكن إذا كان موجوداً
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // عمل Clone للـ Request مرة واحدة بالـ Headers الكاملة
  const clonedReq = req.clone({
    setHeaders: headers
  });

  return next(clonedReq);
};