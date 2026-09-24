import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthResponse, LoginUserCommand } from '../interfaces/Iauth';



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/Authentication`;
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  login(credentials: LoginUserCommand): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // الوصول للتوكن الصحيح وفقاً للـ Response
        if (response && response.succeeded && response.data?.accessToken) {
          this.saveToken(response.data.accessToken);
        }
      })
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
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}