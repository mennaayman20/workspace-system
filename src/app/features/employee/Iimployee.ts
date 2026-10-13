export type EmployeeStatus = 'Active' | 'Inactive' | 'Suspended' | 'Terminated';

/** ⚠️ عدّل القيم حسب الـ enum في الـ Swagger (لو بيرجع أرقام خليها 0 | 1) */
export type Gender = 'Male' | 'Female';

export interface Employee {
  id: number;
  fullName: string;              // الاسم المترجم اللي راجع من الـ list حسب Accept-Language
  firstNameEn?: string | null;
  firstNameAr?: string | null;
  lastNameEn?: string | null;
  lastNameAr?: string | null;
  gender?: Gender | null;
  email?: string;
  mobileNumber?: string;
  assignedWorkspaceId?: number;
  assignedWorkspaceName?: string | null;
  status: EmployeeStatus;
  isDeleted?: boolean;
}

export interface CreateEmployeeDto {
  firstNameEn: string;
  firstNameAr: string;
  lastNameEn: string;
  lastNameAr: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  password: string;
  confirmPassword: string;
}

export interface UpdateEmployeeDto {
  firstNameEn: string;
  firstNameAr: string;
  lastNameEn: string;
  lastNameAr: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
}