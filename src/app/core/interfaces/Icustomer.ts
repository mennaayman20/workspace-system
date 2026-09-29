export type CustomerType = 'Individual' | 'Company';

export interface Customer {
  id: number;
  fullName: string;
  mobileNumber: string;
  email: string;
  companyId?: number | null;
  companyName?: string | null;
  customerType: CustomerType;
  notes?: string | null;
}

export interface Company {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  taxInformation?: string | null;
  contractDetails?: string | null;
  pricingPlanId?: number | null;
  creditLimit?: number | null;
  isActive?: boolean;
}

export interface CreateCustomerCommand {
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  companyId?: number | null;
  customerType: CustomerType;
  notes?: string | null;
}

export interface UpdateCustomerCommand extends CreateCustomerCommand {
  id: number;
}

export interface CreateCompanyCommand {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  taxInformation?: string | null;
  contractDetails?: string | null;
  pricingPlanId?: number | null;
  creditLimit?: number | null;
}

export interface UpdateCompanyCommand extends CreateCompanyCommand {
  id: number;
}