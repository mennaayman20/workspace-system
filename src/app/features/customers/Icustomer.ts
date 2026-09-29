export type CustomerType = 'Individual' | 'Corporate' | 'Member' | 'WalkIn';
export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Customer {
  id: number;
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  customerType: CustomerType;
  notes?: string | null;
  registrationDate?: string;
  status?: CustomerStatus;
}

export interface CreateCustomerDto {
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  companyId?: number | null;
  customerType: CustomerType;
  notes?: string | null;
}