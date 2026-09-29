export interface Company {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  taxInformation?: string;
  contractDetails?: string;
  pricingPlanId?: number;
  creditLimit?: number;
  isActive?: boolean;
}

export interface CreateCompanyDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  taxInformation?: string;
  contractDetails?: string;
  pricingPlanId?: number;
  creditLimit?: number;
}

export interface UpdateCompanyDto extends CreateCompanyDto {
  id: number;
}

export interface ChangeCompanyStatusDto {
  id: number;
  isActive: boolean;
}