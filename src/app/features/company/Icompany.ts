export interface Company {
  id: number;
  name?: string | null;               // المترجم (للعرض)
  nameAr?: string | null;
  nameEn?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  taxInformation?: string | null;
  taxInformationAr?: string | null;
  taxInformationEn?: string | null;
  contractDetails?: string | null;
  contractDetailsAr?: string | null;
  contractDetailsEn?: string | null;
  pricingPlanId?: number | null;
  creditLimit?: number | null;
  isActive?: boolean;
}

export interface CreateCompanyDto {
  nameAr: string;
  nameEn: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  taxInformationAr?: string | null;
  taxInformationEn?: string | null;
  contractDetailsAr?: string | null;
  contractDetailsEn?: string | null;
  pricingPlanId?: number | null;
  creditLimit: number;
}

export interface UpdateCompanyDto extends CreateCompanyDto {
  id: number;
}

export interface ChangeCompanyStatusDto {
  id: number;
  isActive: boolean;
}

export interface CompanyTranslations {
  nameAr: string;
  nameEn: string;
  taxInformationAr: string;
  taxInformationEn: string;
  contractDetailsAr: string;
  contractDetailsEn: string;
}