import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap, map, of } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthResponse, LoginUserCommand } from '../interfaces/Iauth';
import { PermissionService } from './permission.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private permissionService = inject(PermissionService);
  private readonly apiUrl = `${environment.apiUrl}/api/Authentication`;
  private readonly TOKEN_KEY = 'auth_token';

  login(credentials: LoginUserCommand): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response?.succeeded && response.data?.accessToken) {
          this.saveToken(response.data.accessToken);
        }
      }),
      switchMap(response =>
        response?.succeeded
          ? this.permissionService.load().pipe(map(() => response))
          : of(response)
      )
    );
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.permissionService.clear();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}