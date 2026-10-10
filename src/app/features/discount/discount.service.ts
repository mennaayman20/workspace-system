import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import { Discount, CreateDiscountCommand, UpdateDiscountCommand } from './Idiscount';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Discount`;

  discounts = signal<Discount[]>([]);
  isLoading = signal(false);

  // GET /api/Discount
  getDiscounts(): Observable<Discount[]> {
    this.isLoading.set(true);
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => {
        const raw = Array.isArray(res) ? res : (res?.data?.items ?? res?.data ?? res?.items ?? []);
        return (Array.isArray(raw) ? raw : []) as Discount[];
      }),
      tap({
        next: (items) => {
          this.discounts.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      })
    );
  }

  // POST /api/Discount
  createDiscount(command: CreateDiscountCommand): Observable<void> {
    return this.http.post<any>(this.baseUrl, command).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getDiscounts()),
      map(() => void 0)
    );
  }

  // PUT /api/Discount/{id}
  updateDiscount(id: number, command: UpdateDiscountCommand): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, command).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getDiscounts()),
      map(() => void 0)
    );
  }

  // DELETE /api/Discount/{id}
  deleteDiscount(id: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getDiscounts()),
      map(() => void 0)
    );
  }

  // PATCH /api/Discount/{id}/restore
  restoreDiscount(id: number): Observable<void> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/restore`, {}).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getDiscounts()),
      map(() => void 0)
    );
  }

  // لو الباك اند رجّع 200 مع succeeded: false نعتبره خطأ
  private rejectIfFailed() {
    return tap((res: any) => {
      if (res?.succeeded === false) throw { error: res };
    });
  }
}