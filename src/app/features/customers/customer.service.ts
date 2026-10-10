import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  Customer, CreateCustomerDto,
  CUSTOMER_TYPE_BY_LABEL, CUSTOMER_STATUS_BY_LABEL,
} from './Icustomer';
import { environment } from '../../core/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Customer`;

  getCustomers(pageNumber: number = 1, pageSize: number = 10): Observable<Customer[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => this.extractItems(res).map((r) => this.normalize(r))),
    );
  }

  searchCustomers(searchTerm: string, pageNumber: number = 1, pageSize: number = 10): Observable<Customer[]> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.baseUrl}/search`, { params }).pipe(
      map((res) => this.extractItems(res).map((r) => this.normalize(r))),
    );
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => this.normalize(res?.data ?? res)),
    );
  }

  /**
   * بيجيب الاسمين للتعديل:
   * - لو الـ endpoint رجّع fullNameAr/fullNameEn خام، بياخدهم.
   * - غير كده بيطلب العميل مرتين بلغتين مختلفتين (الـ interceptor لازم يسيب الـ header لو متحط).
   */
  getCustomerNames(id: number): Observable<{ fullNameAr: string; fullNameEn: string }> {
    const fetchLang = (lang: 'ar' | 'en') =>
      this.http
        .get<any>(`${this.baseUrl}/${id}`, { headers: { 'Accept-Language': lang } })
        .pipe(map((res) => res?.data ?? res));

    return forkJoin([fetchLang('ar'), fetchLang('en')]).pipe(
      map(([ar, en]) => ({
        fullNameAr: ar?.fullNameAr ?? ar?.fullName ?? '',
        fullNameEn: en?.fullNameEn ?? en?.fullName ?? '',
      })),
    );
  }

  createCustomer(dto: CreateCustomerDto): Observable<{ data: number }> {
    return this.http.post<{ data: number }>(this.baseUrl, dto);
  }

  updateCustomer(id: number, dto: CreateCustomerDto & { id?: number }): Observable<{ data: boolean }> {
    return this.http.put<{ data: boolean }>(`${this.baseUrl}/${id}`, dto);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  restoreCustomer(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/restore`, {});
  }

  // ---------- helpers ----------

  private extractItems(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  /** بيحوّل النوع والحالة من نص مترجم لكود ثابت */
  private normalize(r: any): Customer {
    return {
      ...r,
      customerType: CUSTOMER_TYPE_BY_LABEL[r.customerType] ?? r.customerType,
      status: CUSTOMER_STATUS_BY_LABEL[r.status] ?? r.status,
    };
  }
}