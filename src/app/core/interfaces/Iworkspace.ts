// حالات المساحات المتاحة بناءً على الـ Enum في Swagger
export type WorkspaceStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | 'Inactive';

// الاسم والوصف باللغتين (للتعديل)
export interface LocalizedFields {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

// Interface لنوع المساحة (WorkspaceType)
export interface WorkspaceType {
  id: number;
  name: string;                      // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive?: boolean;
}

// Interface للمساحة الرئيسية (Workspace)
export interface Workspace {
  id: number;
  workspaceTypeId: number;
  workspaceTypeName?: string;
  name: string;                      // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  code: string;
  floor: string;
  location: string;
  capacity: number;
  status: WorkspaceStatus;
  isDeleted?: boolean;
}

// DTOs الخاصة بالـ Workspace Commands
export interface CreateWorkspaceCommand {
  workspaceTypeId: number;
  nameAr: string;
  nameEn: string;
  code: string;
  floor: string;
  location: string;
  capacity: number;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
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
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
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