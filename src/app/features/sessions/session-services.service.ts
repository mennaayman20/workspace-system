import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SessionServiceDto } from './Isessions';
import { environment } from '../../core/environments/environment';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionServicesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/SessionService/sessions`;

getSessionServices(sessionId: number): Observable<SessionServiceDto[]> {
  return this.http
    .get<any>(`${this.base}/${sessionId}/services`)
    .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
}

  addService(sessionId: number, serviceId: number, quantity: number) {
    return this.http.post<void>(`${this.base}/${sessionId}/services`, { serviceId, quantity });
  }

  updateService(sessionId: number, serviceId: number, quantity: number) {
    return this.http.put<void>(`${this.base}/${sessionId}/services/${serviceId}`, { serviceId, quantity });
  }

  removeService(sessionId: number, serviceId: number) {
    return this.http.delete<void>(`${this.base}/${sessionId}/services/${serviceId}`);
  }

  clearServices(sessionId: number) {
    return this.http.delete<void>(`${this.base}/${sessionId}/services`);
  }
}