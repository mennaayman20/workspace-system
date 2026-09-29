import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, CreateCompanyDto, UpdateCompanyDto, ChangeCompanyStatusDto } from './Icompany';
import { environment } from '../../core/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Company`;

  // 1. جلب قائمة الشركات مع Pagination
  getCompanies(pageNumber: number = 1, pageSize: number = 10): Observable<Company[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<Company[]>(this.baseUrl, { params });
  }

  // 2. البحث عن شركات
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

  // 4. إضافة شركة جديدة
  createCompany(dto: CreateCompanyDto): Observable<{ data: number }> {
    return this.http.post<{ data: number }>(this.baseUrl, dto);
  }

  // 5. تعديل بيانات الشركة
  updateCompany(id: number, dto: UpdateCompanyDto): Observable<{ data: boolean }> {
    return this.http.put<{ data: boolean }>(`${this.baseUrl}/${id}`, dto);
  }

  // 6. تغيير حالة الشركة (تنشيط / إيقاف)
  changeStatus(dto: ChangeCompanyStatusDto): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${dto.id}/status`, dto);
  }

  // 7. حذف شركة (Soft delete)
  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // 8. استعادة شركة
  restoreCompany(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/restore`, {});
  }
}