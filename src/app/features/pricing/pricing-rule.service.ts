import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { ApiResponse, PagedResult, PricingRule, PricingRulePayload, RuleOperation } from '../../features/pricing/Ipricing';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingRuleService {
  private readonly http = inject(HttpClient);
  private readonly rulesUrl = `${environment.apiUrl}/api/PricingRule`;
  private readonly plansUrl = `${environment.apiUrl}/api/PricingPlan`;

  getByPlan(planId: number): Observable<PricingRule[]> {
    return this.http
      .get<ApiResponse<PricingRule[] | PagedResult<PricingRule>>>(`${this.plansUrl}/${planId}/rules`)
      .pipe(
        map(({ data }) => {
          const items = Array.isArray(data) ? data : (data?.items ?? []);
          return items.map((r) => ({
            ...r,
            ruleType: String(r.ruleType).replace('PricingRuleType_', ''),
          }));
        }),
      );
  }

  /** الحذف الأول، وبعده الإنشاء والتعديل بالتوازي. */
  applyOperations(operations: RuleOperation[]): Observable<unknown> {
    const deletes: Observable<unknown>[] = [];
    const writes: Observable<unknown>[] = [];

    for (const op of operations) {
      switch (op.kind) {
        case 'delete': deletes.push(this.delete(op.id)); break;
        case 'create': writes.push(this.create(op.payload)); break;
        case 'update': writes.push(this.update(op.id, op.payload)); break;
      }
    }

    const run = (reqs: Observable<unknown>[]) => (reqs.length ? forkJoin(reqs) : of([]));
    return run(deletes).pipe(switchMap(() => run(writes)));
  }

  private create(payload: PricingRulePayload): Observable<number> {
    return this.http.post<ApiResponse<number>>(this.rulesUrl, payload).pipe(map((r) => r.data));
  }
  private update(id: number, payload: PricingRulePayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.rulesUrl}/${id}`, payload).pipe(map(() => void 0));
  }
  private delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.rulesUrl}/${id}`).pipe(map(() => void 0));
  }
}