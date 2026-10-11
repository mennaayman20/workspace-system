import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, tap } from 'rxjs';
import {
  ApiResponse, PagedResult, Translations,
  ProductCategory, CreateProductCategoryCommand
} from '../interfaces/product';
import { environment } from '../../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/ProductCategory`;

  categories = signal<ProductCategory[]>([]);

  getCategories(): Observable<ProductCategory[]> {
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

    return this.http
      .get<ApiResponse<PagedResult<ProductCategory>>>(this.baseUrl, { params })
      .pipe(
        map((res) => res.data.items),
        tap((items) => this.categories.set(items))
      );
  }

  /** الاسم والوصف باللغتين للتعديل (خام لو الباك رجّعه، وإلا طلب بكل لغة) */
  getTranslations(id: number): Observable<Translations> {
    const fetchLang = (lang: 'ar' | 'en') =>
      this.http
        .get<any>(`${this.baseUrl}/${id}`, { headers: { 'Accept-Language': lang } })
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

  createCategory(command: CreateProductCategoryCommand): Observable<ProductCategory> {
    return this.http.post<ApiResponse<ProductCategory>>(this.baseUrl, command).pipe(
      switchMap((res) => this.getCategories().pipe(map(() => res.data)))
    );
  }

  updateCategory(id: number, command: CreateProductCategoryCommand): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, command).pipe(
      switchMap(() => this.getCategories()),
      map(() => void 0)
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      switchMap(() => this.getCategories()),
      map(() => void 0)
    );
  }
}