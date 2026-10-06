export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CreateProductCategoryCommand {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Product {
  id: number;
  productCategoryId: number;
  englishName: string;
  description?: string;
  sku?: string;
  sellingPrice: number;
  productCategoryName:string;

  costPrice: number;
  isActive: boolean;
}

export interface CreateProductCommand {
  productCategoryId: number;
  englishName: string;
  description?: string;
  sku?: string;
  sellingPrice: number;
  costPrice: number;
  isActive: boolean;
}

export interface AddProductCommand {
  sessionId: number;
  productId: number;
  quantity: number;
}


export interface ApiResponse<T> {
  succeeded: boolean;
  message: string;
  data: T;
  meta: unknown;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}