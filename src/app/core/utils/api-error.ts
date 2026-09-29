import { HttpErrorResponse } from '@angular/common/http';

/** يرجّع رسالة الـ API لو موجودة، وإلا الرسالة الافتراضية. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
