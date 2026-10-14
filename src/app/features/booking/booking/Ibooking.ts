export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: number;
  bookingNumber?: string;
  customerId: number;
  /** الاسم المختار حسب لغة الواجهة (للعرض والبحث) */
  customerName: string;
  customerNameAr?: string | null;
  customerNameEn?: string | null;
  workspaceId: number;
  /** الاسم المختار حسب لغة الواجهة (للعرض والبحث) */
  workspaceName: string;
  workspaceNameAr?: string | null;
  workspaceNameEn?: string | null;
  workspaceCode?: string | null;
  bookingDate: string;
  startTime: string;
  expectedEndTime: string | null;
  numberOfPeople: number;
  notes: string | null;
  status: BookingStatus;
  hasSession?: boolean;
}

export interface CreateBookingDto {
  customerId: number;
  workspaceId: number;
  bookingDate: string;
  startTime: string;
  expectedEndTime: string | null;
  numberOfPeople: number;
  notes: string | null;
}

export type UpdateBookingDto = CreateBookingDto;

export interface LookupItem {
  id: number;
  name: string;
}