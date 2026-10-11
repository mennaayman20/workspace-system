import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, tap } from 'rxjs';

import { environment } from '../../core/environments/environment'; // عدّلي المسار
import {
  PACKAGE_TYPES, PACKAGE_TYPE_BY_LABEL,
  PackageItem, PackagePayload, PackageTranslations, PackageType,
} from './Ipackage';

@Injectable({ providedIn: 'root' })
export class PackageService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/Package`;

  readonly packages = signal<PackageItem[]>([]);

  getPackages(): Observable<PackageItem[]> {
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

    return this.http.get<any>(this.url, { params }).pipe(
      map((res) => {
        const raw = Array.isArray(res)
          ? res
          : res?.data?.items ?? res?.data ?? res?.items ?? [];
        return (Array.isArray(raw) ? raw : []).map((r: any) => this.normalize(r));
      }),
      tap((list) => this.packages.set(list)),
    );
  }

  /** الاسم والوصف باللغتين للتعديل (خام لو الباك رجّعه، وإلا طلب بكل لغة) */
  getTranslations(id: number): Observable<PackageTranslations> {
    const fetchLang = (lang: 'ar' | 'en') =>
      this.http
        .get<any>(`${this.url}/${id}`, { headers: { 'Accept-Language': lang } })
        .pipe(map((res) => res?.data ?? res));

    return forkJoin([fetchLang('ar'), fetchLang('en')]).pipe(
      map(([ar, en]) => ({
        nameAr: ar?.nameAr ?? ar?.name ?? '',
        nameEn: en?.nameEn ?? en?.name ?? '',
        descriptionAr: ar?.descriptionAr ?? ar?.description ?? '',
        descriptionEn: en?.descriptionEn ?? en?.description ?? '',
      })),
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

  /** بيظبط شكل الداتا: الـ enum ممكن يجي رقم أو بادئة "PackageType_" أو نص مترجم */
  private normalize(r: any): PackageItem {
    return {
      ...r,
      id: Number(r.id),
      packageType: this.toType(r.packageType),
      totalHours: Number(r.totalHours),
      durationDays: r.durationDays ?? null,
      price: Number(r.price),
      isActive: r.isActive ?? true,
      isDeleted: r.isDeleted ?? false,
    };
  }

  private toType(value: unknown): PackageType {
    if (typeof value === 'number') return PACKAGE_TYPES[value] ?? 'WorkspaceHours';

    const raw = String(value ?? '').replace(/^PackageType_/, '').trim();
    if ((PACKAGE_TYPES as string[]).includes(raw)) return raw as PackageType;
    if (PACKAGE_TYPE_BY_LABEL[raw]) return PACKAGE_TYPE_BY_LABEL[raw];

    const lower = raw.replace(/\s+/g, '').toLowerCase();
    const match = PACKAGE_TYPES.find((t) => t.toLowerCase() === lower);
    return match ?? 'WorkspaceHours';
  }
}