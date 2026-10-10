import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../core/environments/environment'; // عدّلي المسار
import { PACKAGE_TYPES, PackageItem, PackagePayload } from './Ipackage';

@Injectable({ providedIn: 'root' })
export class PackageService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/Package`;

  readonly packages = signal<PackageItem[]>([]);

  getPackages(): Observable<PackageItem[]> {
    return this.http.get<any>(this.url).pipe(
      map((res) => {
        const list = Array.isArray(res)
          ? res
          : res?.data?.items || res?.data || res?.items || [];
        return list.map((r: any) => this.normalize(r));
      }),
      tap((list) => this.packages.set(list)),
    );
  }

  create(payload: PackagePayload): Observable<void> {
    return this.http.post<any>(this.url, payload).pipe(map(() => void 0));
  }

  update(id: number, payload: PackagePayload): Observable<void> {
    return this.http.put<any>(`${this.url}/${id}`, payload).pipe(map(() => void 0));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(map(() => void 0));
  }

  activate(id: number): Observable<void> {
    return this.http.patch<any>(`${this.url}/${id}/activate`, {}).pipe(map(() => void 0));
  }

  deactivate(id: number): Observable<void> {
    return this.http.patch<any>(`${this.url}/${id}/deactivate`, {}).pipe(map(() => void 0));
  }

  restore(id: number): Observable<void> {
    return this.http.patch<any>(`${this.url}/${id}/restore`, {}).pipe(map(() => void 0));
  }

  /** بيظبط شكل الداتا: الـ enum ممكن يجي رقم أو بادئة "PackageType_" */
  private normalize(r: any): PackageItem {
    const type =
      typeof r.packageType === 'number'
        ? PACKAGE_TYPES[r.packageType]
        : String(r.packageType).replace(/^PackageType_/, '');

    return {
      ...r,
      id: Number(r.id),
      packageType: type,
      totalHours: Number(r.totalHours),
      durationDays: r.durationDays ?? null,
      price: Number(r.price),
      isActive: r.isActive ?? true,
      isDeleted: r.isDeleted ?? false,
    };
  }
}