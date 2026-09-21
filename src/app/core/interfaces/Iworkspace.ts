export type WorkspaceType = 
  | 'Open Workspace' 
  | 'Private Desk' 
  | 'Dedicated Desk' 
  | 'Meeting Room' 
  | 'Private Office' 
  | 'Training Room' 
  | 'Conference Room';

export type WorkspaceStatus = 
  | 'Available' 
  | 'Occupied' 
  | 'Reserved' 
  | 'Maintenance' 
  | 'Inactive';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  capacity: number;
  status: WorkspaceStatus;
  location: string;
  description?: string;
  pricingPlanId?: string;
  pricingPlanName?: string;
  isActive: boolean;
}

export interface CreateWorkspaceDto {
  name: string;
  type: WorkspaceType;
  capacity: number;
  location: string;
  description?: string;
  pricingPlanId?: string;
  isActive: boolean;
}

export interface CreateWorkspaceDto {
  name: string;
  type: WorkspaceType;
  capacity: number;
  location: string;
  description?: string;
  pricingPlanId?: string;
  isActive: boolean;
}