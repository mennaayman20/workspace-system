export interface StartSessionCommand {
  customerId: number;
  bookingId?: number | null;
  workspaceId: number;
  pricingPlanId: number;
  numberOfPeople: number;
}

export interface ChangeSessionWorkspaceCommand {
  sessionId: number;
  newWorkspaceId: number;
}

export interface ActiveSessionDto {
  id: number;
  customerId: number;
  customerName: string;
  workspaceId: number;
  workspaceName: string;
  pricingPlanId: number;
  pricingPlanName: string;
  startTime: string; // ISO String from backend
  numberOfPeople: number;
  estimatedPrice?: number;
  status: string;
}

export interface StartSessionCommand {
  customerId: number;
  employeeId: number; // حقل الموظف المسؤول عن الجلسة
  bookingId?: number | null;
  workspaceId: number;
  pricingPlanId: number;
  numberOfPeople: number;
}




export interface SessionProductDto {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}


export interface SessionServiceDto {
  serviceId: number;
  serviceName: string;
  unitPrice: number;
  quantity: number;
}