// حالات المساحات المتاحة بناءً على الـ Enum في Swagger
export type WorkspaceStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | 'Inactive';

// Interface لنوع المساحة (WorkspaceType)
export interface WorkspaceType {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

// Interface للمساحة الرئيسية (Workspace)
export interface Workspace {
  id: number;
  workspaceTypeId: number;
  workspaceTypeName?: string;
  name: string;
  code: string;
  floor: string;
  location: string;
  capacity: number;
  description?: string;
  status: WorkspaceStatus;
  isDeleted?: boolean;
}

// DTOs الخاصة بالـ Workspace Commands
export interface CreateWorkspaceCommand {
  workspaceTypeId: number;
  name: string;
  code: string;
  floor: string;
  location: string;
  capacity: number;
  description?: string;
}

export interface UpdateWorkspaceCommand extends CreateWorkspaceCommand {
  id: number;
}

export interface ChangeWorkspaceStatusCommand {
  id: number;
  status: WorkspaceStatus;
}

// DTOs الخاصة بالـ WorkspaceType Commands
export interface CreateWorkspaceTypeCommand {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceTypeCommand extends CreateWorkspaceTypeCommand {
  id: number;
}

export interface ChangeWorkspaceTypeStatusCommand {
  id: number;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  succeeded: boolean;
  message: string;
  data: {
    items: T[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalCount: number;
    totalPages: number;
    pageNumber: number;
    pageSize: number;
  };
}