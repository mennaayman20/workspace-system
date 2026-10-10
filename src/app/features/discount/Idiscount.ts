export type DiscountType = 'FixedAmount' | 'Percentage';

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  FixedAmount: 'مبلغ ثابت',
  Percentage: 'نسبة مئوية',
};

export interface Discount {
  id: number;
  name: string;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  isDeleted?: boolean;
}

export interface CreateDiscountCommand {
  name: string;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateDiscountCommand extends CreateDiscountCommand {
  id: number;
}