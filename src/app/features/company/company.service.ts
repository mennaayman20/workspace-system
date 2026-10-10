import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  Company, CreateCompanyDto, UpdateCompanyDto, ChangeCompanyStatusDto, CompanyTranslations,
} from './Icompany';
import { environment } from '../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/Company`;

  getCompanies(pageNumber: number = 1, pageSize: number = 10): Observable<Company[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(this.baseUrl, { params });
  }

  searchCompanies(searchTerm: string, pageNumber: number = 1, pageSize: number = 10): Observable<Company[]> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.baseUrl}/search`, { params });
  }

  getCompanyById(id: number): Observable<Company> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(map((res) => res?.data ?? res));
  }

  /** بيجيب القيم باللغتين للتعديل (خام لو الباك رجّعها، وإلا طلب بكل لغة) */
  getTranslations(id: number): Observable<CompanyTranslations> {
    const fetchLang = (lang: 'ar' | 'en') =>
      this.http
        .get<any>(`${this.baseUrl}/${id}`, { headers: { 'Accept-Language': lang } })
        .pipe(map((res) => res?.data ?? res));

    return forkJoin([fetchLang('ar'), fetchLang('en')]).pipe(
      map(([ar, en]) => ({
        nameAr: ar?.nameAr ?? ar?.name ?? '',
        nameEn: en?.nameEn ?? en?.name ?? '',
        taxInformationAr: ar?.taxInformationAr ?? ar?.taxInformation ?? '',
        taxInformationEn: en?.taxInformationEn ?? en?.taxInformation ?? '',
        contractDetailsAr: ar?.contractDetailsAr ?? ar?.contractDetails ?? '',
        contractDetailsEn: en?.contractDetailsEn ?? en?.contractDetails ?? '',
      })),
    );
  }

createCompany(dto: CreateCompanyDto): Observable<{ data: number }> {
  console.trace('createCompany CALLED', dto);   // مؤقت
  return this.http.post<{ data: number }>(this.baseUrl, dto);
}

  updateCompany(id: number, dto: UpdateCompanyDto): Observable<{ data: boolean }> {
    return this.http.put<{ data: boolean }>(`${this.baseUrl}/${id}`, dto);
  }

  changeStatus(dto: ChangeCompanyStatusDto): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${dto.id}/status`, dto);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  restoreCompany(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/restore`, {});
  }
}