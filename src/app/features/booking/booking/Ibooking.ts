export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: number;
  customerId: number;
  customerName: string;
  workspaceId: number;
  workspaceName: string;
  bookingDate: string;
  startTime: string;
  expectedEndTime: string | null;
  numberOfPeople: number;
  notes: string | null;
  status: BookingStatus;
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