import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, CreateCompanyDto, CompanyStatusDto } from './Icompany';
import { environment } from '../../core/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Company`;

  // 1. عرض قائمة الشركات المصفحة (للوحة التحكم/الإدارة)
  getCompanies(pageNumber: number = 1, pageSize: number = 10): Observable<Company[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<Company[]>(this.baseUrl, { params });
  }

  // 2. البحث عن الشركات أثناء اختيار Corporate Customer (Type-ahead search)
  searchCompanies(searchTerm: string, pageNumber: number = 1, pageSize: number = 10): Observable<Company[]> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<Company[]>(`${this.baseUrl}/search`, { params });
  }

  // 3. جلب تفاصيل شركة محددة
  getCompanyById(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  // 4. إنشاء شركة جديدة
  createCompany(dto: CreateCompanyDto): Observable<{ data: number }> {
    return this.http.post<{ data: number }>(this.baseUrl, dto);
  }

  // 5. تعديل بيانات شركة
  updateCompany(id: number, dto: CreateCompanyDto): Observable<{ data: boolean }> {
    return this.http.put<{ data: boolean }>(`${this.baseUrl}/${id}`, dto);
  }

  // 6. تغيير حالة التفعيل (Active/Inactive) دون الحذف
  updateCompanyStatus(id: number, isActive: boolean): Observable<{ data: boolean }> {
    const body: CompanyStatusDto = { isActive };
    return this.http.patch<{ data: boolean }>(`${this.baseUrl}/${id}/status`, body);
  }

  // 7. الحذف المؤقت (Soft Delete)
  deleteCompany(id: number): Observable<{ data: boolean }> {
    return this.http.delete<{ data: boolean }>(`${this.baseUrl}/${id}`);
  }

  // 8. استعادة شركة محذوفة
  restoreCompany(id: number): Observable<{ data: boolean }> {
    return this.http.patch<{ data: boolean }>(`${this.baseUrl}/${id}/restore`, {});
  }

  // 9. جلب العملاء/الموظفين المربوطين بحساب هذه الشركة
  getCompanyCustomers(id: number, pageNumber: number = 1, pageSize: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.baseUrl}/${id}/customers`, { params });
  }
}