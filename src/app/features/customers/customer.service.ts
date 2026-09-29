import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer, CreateCustomerDto } from './Icustomer';
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

    return this.http.get<Customer[]>(this.baseUrl, { params });
  }

  // 1. البحث السريع عن عميل بالاسم أو الهاتف لاستكمال الـ Check-in
  searchCustomers(searchTerm: string, pageNumber: number = 1, pageSize: number = 10): Observable<Customer[]> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<Customer[]>(`${this.baseUrl}/search`, { params });
  }

  // 2. جلب عميل محدد
  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  // 3. إنشاء عميل جديد واسترجاع الـ customerId الناتج لاستخدامه بالـ Session
  createCustomer(dto: CreateCustomerDto): Observable<{ data: number }> {
    return this.http.post<{ data: number }>(this.baseUrl, dto);
  }

  // 4. تعديل بيانات العميل
  updateCustomer(id: number, dto: CreateCustomerDto): Observable<{ data: boolean }> {
    return this.http.put<{ data: boolean }>(`${this.baseUrl}/${id}`, dto);
  }

  // 5. حذف عميل (Soft delete)
  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // 6. استعادة عميل
  restoreCustomer(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/restore`, {});
  }
}