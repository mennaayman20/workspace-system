import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, shareReplay, tap } from 'rxjs';

import {
  Workspace,
  WorkspaceType,
  LocalizedFields,
  CreateWorkspaceCommand,
  UpdateWorkspaceCommand,
  ChangeWorkspaceStatusCommand,
  CreateWorkspaceTypeCommand,
  UpdateWorkspaceTypeCommand,
  ChangeWorkspaceTypeStatusCommand,
  PaginatedResponse
} from '../../core/interfaces/Iworkspace';
import { environment } from '../environments/environment';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  isSuccess?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api`;

  private workspacesCache$?: Observable<Workspace[]>;
  private workspaceTypesCache$?: Observable<WorkspaceType[]>;

  /** الباك بيرجّع صفحات (الافتراضي 10)، فبنطلب صفحة كبيرة */
  private readonly listParams = new HttpParams().set('pageNumber', 1).set('pageSize', 100);

  // ==========================================
  // 1. WORKSPACE ENDPOINTS
  // ==========================================

  getWorkspaces(forceReload = false): Observable<Workspace[]> {
    if (!this.workspacesCache$ || forceReload) {
      this.workspacesCache$ = this.http
        .get<PaginatedResponse<Workspace>>(`${this.baseUrl}/Workspace`, { params: this.listParams })
        .pipe(
          map(res => res.data.items),
          shareReplay(1)
        );
    }
    return this.workspacesCache$;
  }

  getWorkspaceById(id: number): Observable<Workspace> {
    return this.http.get<ApiResponse<Workspace>>(`${this.baseUrl}/Workspace/${id}`).pipe(
      map(res => res.data)
    );
  }

  /** الاسم والوصف باللغتين للتعديل (خام لو الباك رجّعه، وإلا طلب بكل لغة) */
  getWorkspaceTranslations(id: number): Observable<LocalizedFields> {
    return this.fetchTranslations(`${this.baseUrl}/Workspace/${id}`);
  }

  createWorkspace(command: CreateWorkspaceCommand): Observable<Workspace> {
    return this.http.post<ApiResponse<Workspace>>(`${this.baseUrl}/Workspace`, command).pipe(
      map(res => res.data),
      tap(() => this.clearWorkspacesCache())
    );
  }

  updateWorkspace(id: number, command: UpdateWorkspaceCommand): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/Workspace/${id}`, command).pipe(
      tap(() => this.clearWorkspacesCache())
    );
  }

  deleteWorkspace(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Workspace/${id}`).pipe(
      tap(() => this.clearWorkspacesCache())
    );
  }

  changeWorkspaceStatus(id: number, command: ChangeWorkspaceStatusCommand): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/Workspace/${id}/status`, command).pipe(
      tap(() => this.clearWorkspacesCache())
    );
  }

  restoreWorkspace(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/Workspace/${id}/restore`, {}).pipe(
      tap(() => this.clearWorkspacesCache())
    );
  }

  // ==========================================
  // 2. WORKSPACE TYPE ENDPOINTS
  // ==========================================

  getWorkspaceTypes(forceReload = false): Observable<WorkspaceType[]> {
    if (!this.workspaceTypesCache$ || forceReload) {
      this.workspaceTypesCache$ = this.http
        .get<PaginatedResponse<WorkspaceType>>(`${this.baseUrl}/WorkspaceType`, { params: this.listParams })
        .pipe(
          map(res => res.data.items),
          shareReplay(1)
        );
    }
    return this.workspaceTypesCache$;
  }

  getWorkspaceTypeById(id: number): Observable<WorkspaceType> {
    return this.http.get<ApiResponse<WorkspaceType>>(`${this.baseUrl}/WorkspaceType/${id}`).pipe(
      map(res => res.data)
    );
  }

  getWorkspaceTypeTranslations(id: number): Observable<LocalizedFields> {
    return this.fetchTranslations(`${this.baseUrl}/WorkspaceType/${id}`);
  }

  createWorkspaceType(command: CreateWorkspaceTypeCommand): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/WorkspaceType`, command).pipe(
      map(res => res.data),
      tap(() => this.clearWorkspaceTypesCache())
    );
  }

  updateWorkspaceType(id: number, command: UpdateWorkspaceTypeCommand): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/WorkspaceType/${id}`, command).pipe(
      tap(() => this.clearWorkspaceTypesCache())
    );
  }

  changeWorkspaceTypeStatus(id: number, command: ChangeWorkspaceTypeStatusCommand): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/WorkspaceType/${id}/status`, command).pipe(
      tap(() => this.clearWorkspaceTypesCache())
    );
  }

  // ==========================================
  // 3. HELPERS
  // ==========================================

  private fetchTranslations(url: string): Observable<LocalizedFields> {
    const fetchLang = (lang: 'ar' | 'en') =>
      this.http
        .get<any>(url, { headers: { 'Accept-Language': lang } })
        .pipe(map(res => res?.data ?? res));

    return forkJoin([fetchLang('ar'), fetchLang('en')]).pipe(
      map(([ar, en]) => ({
        nameAr: ar?.nameAr ?? ar?.name ?? '',
        nameEn: en?.nameEn ?? en?.name ?? '',
        descriptionAr: ar?.descriptionAr ?? ar?.description ?? '',
        descriptionEn: en?.descriptionEn ?? en?.description ?? ''
      }))
    );
  }

  // ==========================================
  // 4. CACHE CLEARERS
  // ==========================================

  clearWorkspacesCache(): void {
    this.workspacesCache$ = undefined;
  }

  clearWorkspaceTypesCache(): void {
    this.workspaceTypesCache$ = undefined;
  }

  clearAllCache(): void {
    this.clearWorkspacesCache();
    this.clearWorkspaceTypesCache();
  }
}