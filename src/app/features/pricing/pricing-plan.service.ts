import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  ApiResponse,
  PagedResult,
  PricingPlan,
  PricingPlanPayload,
  PricingPlanQuery,
} from '../../features/pricing/Ipricing';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingPlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/PricingPlan`;

  getPlans(query: PricingPlanQuery = {}): Observable<PagedResult<PricingPlan>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http
      .get<ApiResponse<PagedResult<PricingPlan>>>(this.url, { params })
      .pipe(map((res) => res.data));
  }

  getById(id: number): Observable<PricingPlan> {
    return this.http.get<ApiResponse<PricingPlan>>(`${this.url}/${id}`).pipe(map((res) => res.data));
  }

  /** بيرجّع id الخطة الجديدة */
  create(payload: PricingPlanPayload): Observable<number> {
    return this.http.post<ApiResponse<number>>(this.url, payload).pipe(map((res) => res.data));
  }

  update(id: number, payload: PricingPlanPayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.url}/${id}`, payload).pipe(map(() => void 0));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.url}/${id}`).pipe(map(() => void 0));
  }
}
