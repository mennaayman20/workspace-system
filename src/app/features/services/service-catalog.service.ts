import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import { ServiceItem, CreateServiceCommand, UpdateServiceCommand } from './Iservice';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class ServiceCatalogService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Service`;

  services = signal<ServiceItem[]>([]);
  isLoading = signal(false);

  getServices(): Observable<ServiceItem[]> {
    this.isLoading.set(true);
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => {
        const raw = Array.isArray(res) ? res : (res?.data?.items ?? res?.data ?? res?.items ?? []);
        return (Array.isArray(raw) ? raw : []) as ServiceItem[];
      }),
      tap({
        next: (items) => {
          this.services.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      })
    );
  }

  createService(command: CreateServiceCommand): Observable<void> {
    return this.http.post<any>(this.baseUrl, command).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getServices()),
      map(() => void 0)
    );
  }

  updateService(id: number, command: UpdateServiceCommand): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, command).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getServices()),
      map(() => void 0)
    );
  }

  deleteService(id: number): Observable<void> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getServices()),
      map(() => void 0)
    );
  }

  restoreService(id: number): Observable<void> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/restore`, {}).pipe(
      this.rejectIfFailed(),
      switchMap(() => this.getServices()),
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