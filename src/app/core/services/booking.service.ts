import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Booking, CreateBookingDto, Customer } from '../interfaces/Ibooking';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly BOOKINGS_KEY = 'mock_bookings_db';
  private readonly CUSTOMERS_KEY = 'mock_customers_db';

  private initialCustomers: Customer[] = [
    {
      id: 'cust-1',
      fullName: 'أحمد محمد',
      mobileNumber: '01012345678',
      email: 'ahmed@example.com',
      customerType: 'Individual',
      registrationDate: new Date().toISOString()
    },
    {
      id: 'cust-2',
      fullName: 'شركة الإبداع للبرمجيات',
      mobileNumber: '01198765432',
      company: 'الإبداع',
      customerType: 'Corporate',
      registrationDate: new Date().toISOString()
    }
  ];

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (!localStorage.getItem(this.CUSTOMERS_KEY)) {
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(this.initialCustomers));
    }
    if (!localStorage.getItem(this.BOOKINGS_KEY)) {
      localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify([]));
    }
  }

  private getStorageData<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // البحث والإنشاء للعملاء
  getCustomers(): Observable<Customer[]> {
    return of(this.getStorageData<Customer>(this.CUSTOMERS_KEY)).pipe(delay(300));
  }

  // جلب كافة الحجوزات
  getBookings(): Observable<Booking[]> {
    return of(this.getStorageData<Booking>(this.BOOKINGS_KEY)).pipe(delay(400));
  }

  // إضافة حجز / تسجيل عميل جديد بالـ Workspace
  createBooking(dto: CreateBookingDto, workspaceName: string, workspaceType: any): Observable<Booking> {
    const customers = this.getStorageData<Customer>(this.CUSTOMERS_KEY);
    const bookings = this.getStorageData<Booking>(this.BOOKINGS_KEY);

    let activeCustomer: Customer;

    // 1. معالجة العميل (اختيار موجود أو إضافة جديد)
    if (dto.customerId) {
      const found = customers.find(c => c.id === dto.customerId);
      if (!found) return throwError(() => new Error('العميل غير موجود'));
      activeCustomer = found;
    } else if (dto.newCustomer) {
      activeCustomer = {
        id: `cust-${Date.now()}`,
        fullName: dto.newCustomer.fullName,
        mobileNumber: dto.newCustomer.mobileNumber,
        email: dto.newCustomer.email,
        company: dto.newCustomer.company,
        customerType: dto.newCustomer.customerType,
        registrationDate: new Date().toISOString()
      };
      customers.unshift(activeCustomer);
      this.saveStorageData(this.CUSTOMERS_KEY, customers);
    } else {
      return throwError(() => new Error('يرجى اختيار عميل أو إضافة بيانات عميل جديد'));
    }

    // 2. إنشاء كائن الحجز
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingNumber: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      customerId: activeCustomer.id,
      customerName: activeCustomer.fullName,
      customerMobile: activeCustomer.mobileNumber,
      workspaceId: dto.workspaceId,
      workspaceName: workspaceName,
      workspaceType: workspaceType,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      expectedEndTime: dto.expectedEndTime,
      numberOfPeople: dto.numberOfPeople,
      status: dto.isDirectCheckIn ? 'Checked-in' : 'Confirmed',
      notes: dto.notes,
      createdAt: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    this.saveStorageData(this.BOOKINGS_KEY, bookings);

    return of(newBooking).pipe(delay(500));
  }
}