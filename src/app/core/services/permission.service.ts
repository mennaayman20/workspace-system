import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/Permissions`;

  private _roles = signal<string[]>([]);
  private _permissions = signal<Set<string>>(new Set());
  loaded = signal(false);

  load() {
    return this.http.get<any>(`${this.apiUrl}/current`).pipe(
      tap(res => {
        const data = res?.data;
        this._roles.set(data?.roles ?? []);
        this._permissions.set(new Set(data?.permissions ?? []));
        this.loaded.set(true);
      })
    );
  }

  has(permission: string): boolean {
    return this._permissions().has(permission);
  }

  hasAny(perms: string[]): boolean {
    return perms.some(p => this.has(p));
  }

  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  clear() {
    this._roles.set([]);
    this._permissions.set(new Set());
    this.loaded.set(false);
  }
}