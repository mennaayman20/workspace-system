import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../core/environments/environment';
import {
  CreateEmployeeDto,
  Employee,
  EmployeeStatus,
  UpdateEmployeeDto
} from './Iimployee';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/Employees`;
  private authUrl = `${environment.apiUrl}/api/Authentication`;

  /** جلب الموظفين (شامل المحذوفين لو الـ API بيدعم الباراميتر ده) وتوحيد شكل الداتا */
  getEmployees(): Observable<Employee[]> {
    return this.http
      .get<any>(this.baseUrl, { params: { includeDeleted: true } })
      .pipe(
        map(res => {
          const list: any[] = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.data?.items)
                ? res.data.items
                : Array.isArray(res?.items)
                  ? res.items
                  : [];
          return list.map(r => this.normalize(r));
        })
      );
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.http
      .get<any>(`${this.baseUrl}/${id}`)
      .pipe(map(res => this.normalize(res?.data ?? res)));
  }

  createEmployee(data: CreateEmployeeDto): Observable<unknown> {
    return this.http.post<unknown>(`${this.authUrl}/register`, data);
  }

  updateEmployee(id: number, data: UpdateEmployeeDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, data);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  changeStatus(id: number, status: EmployeeStatus): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, { status });
  }

  restoreEmployee(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/restore`, {});
  }

  assignToWorkspace(employeeId: number, workspaceId: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${employeeId}/workspace`, { workspaceId });
  }

  /** يوحّد أسماء الحقول (phoneNumber/mobileNumber و firstName+lastName/fullName) */
  private normalize(raw: any): Employee {
    const fullName =
      raw?.fullName ?? [raw?.firstName, raw?.lastName].filter(Boolean).join(' ');
    return {
      id: raw.id,
      fullName: fullName || '-',
      email: raw.email,
mobileNumber: raw.mobileNumber ?? raw.phoneNumber ?? raw.phone,      assignedWorkspaceId: raw.assignedWorkspaceId,
      status: raw.status ?? 'Active',
      isDeleted: raw.isDeleted ?? false
    };
  }
}