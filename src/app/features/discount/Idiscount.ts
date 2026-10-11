export type DiscountType = 'Percentage' | 'FixedAmount';

export interface Discount {
  id: number;
  name: string;                      // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  isDeleted?: boolean;
}

export interface CreateDiscountCommand {
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface UpdateDiscountCommand extends CreateDiscountCommand {
  id: number;
}

export interface DiscountTranslations {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

// راجعي النصوص دي مع اللي كانت عندك قبل كده
export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  Percentage: 'نسبة مئوية',
  FixedAmount: 'مبلغ ثابت',
};