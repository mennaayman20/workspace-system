export interface Company {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  taxNumber?: string | null;
  taxInformation?: string | null;
  contractDetails?: string | null;
  pricingPlanId?: number | null;
  creditLimit: number;
  isActive: boolean;
}

export interface CreateCompanyDto {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  taxNumber?: string | null;
  taxInformation?: string | null;
  contractDetails?: string | null;
  pricingPlanId?: number | null;
  creditLimit: number;
}

export interface CompanyStatusDto {
  isActive: boolean;
}