import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../core/environments/environment';
import { ApiResponse } from '../products/interfaces/product'; // عدّلي المسار
import { SessionProductDto } from './Isessions';

@Injectable({ providedIn: 'root' })
export class SessionProductsService {
  private http = inject(HttpClient);
  private url(sessionId: number) {
    return `${environment.apiUrl}/api/sessions/${sessionId}/products`;
  }

getSessionProducts(sessionId: number): Observable<SessionProductDto[]> {
  return this.http.get<any>(this.url(sessionId)).pipe(
    map((res) => {
      const raw = Array.isArray(res)
        ? res
        : (res?.data?.items ?? res?.data?.products ?? res?.data ?? res?.items ?? []);
      return Array.isArray(raw) ? raw : [];
    })
  );
}

  // POST
  addProduct(sessionId: number, productId: number, quantity = 1): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(this.url(sessionId), { sessionId, productId, quantity })
      .pipe(map(() => void 0));
  }

  // PUT
  updateQuantity(sessionId: number, productId: number, quantity: number): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.url(sessionId)}/${productId}`, { sessionId, productId, quantity })
      .pipe(map(() => void 0));
  }

  // DELETE واحد
  removeProduct(sessionId: number, productId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.url(sessionId)}/${productId}`)
      .pipe(map(() => void 0));
  }

  // DELETE الكل
  clearProducts(sessionId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(this.url(sessionId))
      .pipe(map(() => void 0));
  }
}