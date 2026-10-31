import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../core/environments/environment';
import { AddUserToRoleCommand, AppUser, PagedResult } from './Iusers';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private authUrl = `${environment.apiUrl}/api/Authentication`;

  /** GET /api/Authentication?PageNumber&PageSize&Search */
  getUsers(pageNumber: number, pageSize: number, search?: string): Observable<PagedResult<AppUser>> {
    let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
    if (search?.trim()) params = params.set('Search', search.trim());

    return this.http.get<any>(this.authUrl, { params }).pipe(
      map(res => {
        const body = res?.data ?? res;
        const list: any[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.items)
            ? body.items
            : Array.isArray(res?.items)
              ? res.items
              : [];
        return {
          items: list.map(r => this.normalize(r)),
          totalCount: body?.totalCount ?? body?.totalItems ?? body?.total ?? res?.totalCount ?? list.length,
          pageNumber: body?.pageNumber ?? body?.page ?? pageNumber,
          pageSize: body?.pageSize ?? pageSize
        };
      })
    );
  }

  /** POST /api/Authentication/{userId}/role */
  assignRole(userId: string, roleName: string): Observable<unknown> {
    const body: AddUserToRoleCommand = { userId, roleName };
    return this.http.post<unknown>(`${this.authUrl}/${userId}/role`, body);
  }

  private normalize(raw: any): AppUser {
    // الـ API ممكن يرجّع roles كـ array of strings أو objects أو role واحد
    let roles: string[] = [];
    if (Array.isArray(raw?.roles)) {
      roles = raw.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? r?.roleName)).filter(Boolean);
    } else if (raw?.role) {
      roles = [typeof raw.role === 'string' ? raw.role : raw.role?.name ?? raw.role?.roleName].filter(Boolean);
    } else if (raw?.roleName) {
      roles = [raw.roleName];
    }

    const fullName =
      raw?.fullName ?? [raw?.firstName, raw?.lastName].filter(Boolean).join(' ');

    return {
      id: String(raw?.id ?? raw?.userId),
      fullName: fullName || raw?.userName || '-',
      userName: raw?.userName ?? raw?.username ?? '',
      email: raw?.email ?? '',
      roles
    };
  }
}