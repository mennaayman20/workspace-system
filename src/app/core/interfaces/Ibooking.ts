import { WorkspaceType } from './Iworkspace';

export type CustomerType = 'Individual' | 'Corporate' | 'Member' | 'Walk-in';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-in' | 'Completed' | 'Cancelled';

export interface Customer {
  id: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  company?: string;
  customerType: CustomerType;
  registrationDate: string;
}

export interface CreateBookingDto {
  customerId?: string;
  // بيانات العميل في حال إنشاء عميل جديد بنفس الوقت
  newCustomer?: {
    fullName: string;
    mobileNumber: string;
    email?: string;
    company?: string;
    customerType: CustomerType;
  };
  workspaceId: string;
  pricingPlanId?: string;
  bookingDate: string;
  startTime: string;
  expectedEndTime?: string;
  numberOfPeople: number;
  notes?: string;
  isDirectCheckIn: boolean; // تحديد ما إذا كان حجز أم Check-in مباشر
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  bookingDate: string;
  startTime: string;
  expectedEndTime?: string;
  numberOfPeople: number;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}