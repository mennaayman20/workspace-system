export type CustomerType = 'Individual' | 'Corporate' | 'Member' | 'WalkIn';
export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Customer {
  id: number;
  fullName?: string | null;      // الاسم المترجم اللي راجع في الـ List (للعرض)
  fullNameAr?: string | null;
  fullNameEn?: string | null;
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
  fullNameAr: string;
  fullNameEn: string;
  mobileNumber: string;
  email?: string | null;
  companyId?: number | null;
  customerType: CustomerType;
  notes?: string | null;
}

/** النصوص اللي الباك بيرجّعها (مترجمة) → الكود الثابت */
export const CUSTOMER_TYPE_BY_LABEL: Record<string, CustomerType> = {
  'فرد': 'Individual',
  'فردي': 'Individual',
  'شركة': 'Corporate',
  'شركات': 'Corporate',
  'عضو': 'Member',
  'عميل عابر': 'WalkIn',
  'زائر': 'WalkIn',
};

export const CUSTOMER_STATUS_BY_LABEL: Record<string, CustomerStatus> = {
  'نشط': 'Active',
  'غير نشط': 'Inactive',
  'محظور': 'Blocked',
};

/** للعرض في الجدول حسب اللغة */
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, { ar: string; en: string }> = {
  Individual: { ar: 'فرد', en: 'Individual' },
  Corporate:  { ar: 'شركة', en: 'Corporate' },
  Member:     { ar: 'عضو', en: 'Member' },
  WalkIn:     { ar: 'عميل عابر', en: 'Walk-in' },
};