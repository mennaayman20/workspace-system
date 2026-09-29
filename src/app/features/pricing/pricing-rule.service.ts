import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import {
  ApiResponse,
  PricingRule,
  PricingRulePayload,
  RuleOperation,
} from '../../features/pricing/Ipricing';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingRuleService {
  private readonly http = inject(HttpClient);
  private readonly rulesUrl = `${environment.apiUrl}/api/PricingRule`;
  private readonly plansUrl = `${environment.apiUrl}/api/PricingPlan`;

getByPlan(planId: number): Observable<PricingRule[]> {
  // بدلاً من /api/PricingRule?planId=1
  // نستخدم الأند بوينت المخصصة: /api/PricingPlan/1/rules
  return this.http.get<any>(`${environment.apiUrl}/api/PricingPlan/${planId}/rules`).pipe(
    map((res) => {
      const rules = Array.isArray(res) ? res : res?.data?.items || res?.data || res?.items || [];
      return rules;
    })
  );
}
  /**
   * بينفّذ الحذف الأول ثم الإنشاء/التعديل، عشان لو المستخدم بدّل
   * RoundUp ← RoundDown ميحصلش تعارض بين القاعدتين.
   */
applyOperations(operations: RuleOperation[]): Observable<unknown> {
  const deletes: Observable<unknown>[] = [];
  const writes: Observable<unknown>[] = [];

  // 1. تجميع الـ HTTP Requests في مصفوفات عادية
  for (const op of operations) {
    if (op.kind === 'delete') deletes.push(this.delete(op.id));
    if (op.kind === 'create') deletes.push(this.create(op.payload)); // أو ضيفها لـ writes
    if (op.kind === 'update') writes.push(this.update(op.id, op.payload));
  }

  // 2. تنفيّذ الحذف الأول.. ولما يخلص ننفّذ الإنشاء والتعديل
  const run = (requests: Observable<unknown>[]) => 
    requests.length ? forkJoin(requests) : of([]);

  return run(deletes).pipe(
    switchMap(() => run(writes))
  );
}
  private create(payload: PricingRulePayload): Observable<number> {
    return this.http.post<ApiResponse<number>>(this.rulesUrl, payload).pipe(map((res) => res.data));
  }

  private update(id: number, payload: PricingRulePayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.rulesUrl}/${id}`, payload).pipe(map(() => void 0));
  }

  private delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.rulesUrl}/${id}`).pipe(map(() => void 0));
  }
}