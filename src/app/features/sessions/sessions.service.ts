
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StartSessionCommand, ChangeSessionWorkspaceCommand, ActiveSessionDto } from './Isessions';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../core/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private http = inject(HttpClient);

    private readonly baseUrl = `${environment.apiUrl}/api/Sessions`;

  // 1. بدء جلسة جديدة (Start a new session)
  startSession(command: StartSessionCommand): Observable<ActiveSessionDto> {
    return this.http.post<ActiveSessionDto>(this.baseUrl, command);
  }

  // 2. جلب الجلسات النشطة (Get active sessions)
  getActiveSessions(): Observable<ActiveSessionDto[]> {
    return this.http.get<ActiveSessionDto[]>(`${this.baseUrl}/active`);
  }

  // 3. جلب تفاصيل جلسة محددة (Get session details)
  getSessionById(id: number): Observable<ActiveSessionDto> {
    return this.http.get<ActiveSessionDto>(`${this.baseUrl}/${id}`);
  }

  // 4. إنهاء الجلسة (End a session)
  endSession(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/end`, {});
  }

  // 5. نقل الجلسة لمكان آخر (Change session workspace)
  changeWorkspace(sessionId: number, command: ChangeSessionWorkspaceCommand): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${sessionId}/workspace`, command);
  }
}