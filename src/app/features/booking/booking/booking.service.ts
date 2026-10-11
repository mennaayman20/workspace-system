import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { unwrapList } from '../../../core/utils/unwrap-list';
import { Booking, BookingStatus, CreateBookingDto, UpdateBookingDto } from './Ibooking';
import { environment } from '../../../core/environments/environment';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/Bookings`;

  /** الباك بيرجّع صفحات، فبنطلب صفحة كبيرة عشان البورد الأسبوعي */
  getBookings(pageNumber = 1, pageSize = 100): Observable<Booking[]> {
    const params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    return this.http
      .get<any>(this.baseUrl, { params })
      .pipe(map(res => unwrapList(res).map(r => this.normalize(r))));
  }

  getBookingById(id: number): Observable<Booking> {
    return this.http
      .get<any>(`${this.baseUrl}/${id}`)
      .pipe(map(res => this.normalize(res?.data ?? res)));
  }

  createBooking(data: CreateBookingDto): Observable<unknown> {
    return this.http.post<unknown>(this.baseUrl, data);
  }

  updateBooking(id: number, data: UpdateBookingDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, data);
  }

  deleteBooking(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  changeStatus(id: number, status: BookingStatus): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, { status });
  }

  private normalize(raw: any): Booking {
    return {
      id: raw.id,
      customerId: raw.customerId ?? raw.customer?.id,
      customerName: raw.customerName ?? raw.customer?.fullName ?? '-',
      workspaceId: raw.workspaceId ?? raw.workspace?.id,
      workspaceName: raw.workspaceName ?? raw.workspace?.name ?? '-',
      bookingDate: raw.bookingDate,
      startTime: raw.startTime,
      expectedEndTime: raw.expectedEndTime ?? null,
      numberOfPeople: raw.numberOfPeople ?? 1,
      notes: raw.notes ?? null,
      status: raw.status ?? 'Pending'
    };
  }
}