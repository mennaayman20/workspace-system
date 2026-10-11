export interface ServiceItem {
  id: number;
  name?: string | null;            // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface CreateServiceCommand {
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  price: number;
  isActive: boolean;
}

// شيلي id من هنا لو الباك مش بيطلبه في الـ body
export interface UpdateServiceCommand extends CreateServiceCommand {
  id: number;
}

export interface ServiceTranslations {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}