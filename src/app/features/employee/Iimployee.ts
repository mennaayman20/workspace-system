export type EmployeeStatus = 'Active' | 'Inactive' | 'Suspended' | 'Terminated';

export interface Employee {
  id: number;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  assignedWorkspaceId?: number;
  status: EmployeeStatus;
  isDeleted?: boolean;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: string;
}

export interface UpdateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}