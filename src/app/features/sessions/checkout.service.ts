import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../core/environments/environment';

export interface CheckoutRequestDto {
  discountId?: number | null;
  taxRate?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/Checkout/sessions`;

  // POST /api/Checkout/sessions/{sessionId}
  checkoutSession(sessionId: number, request: CheckoutRequestDto = {}) {
    const body: CheckoutRequestDto = {
      discountId: request.discountId ?? null,
      taxRate: request.taxRate ?? null,
    };
    return this.http.post<any>(`${this.base}/${sessionId}`, body);
  }
}