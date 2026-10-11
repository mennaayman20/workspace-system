export interface ProductCategory {
  id: number;
  name?: string | null;               // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive: boolean;
}

export interface CreateProductCategoryCommand {
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
}

export interface Product {
  id: number;
  productCategoryId: number;
  productCategoryName?: string | null;
  name?: string | null;               // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  englishName?: string | null;        // قديم، لو الباك لسه بيرجّعه
  sku?: string | null;
  sellingPrice: number;
  costPrice: number;
  isActive: boolean;
}

export interface CreateProductCommand {
  productCategoryId: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sku: string | null;
  sellingPrice: number;
  costPrice: number;
  isActive: boolean;
}

export interface Translations {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
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