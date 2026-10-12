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



export const DISCOUNT_TYPES: DiscountType[] = ['Percentage', 'FixedAmount'];

/** النصوص اللي الباك ممكن يرجّعها (مترجمة) → الكود الثابت. راجعيها مع الـ response الحقيقي */
export const DISCOUNT_TYPE_BY_LABEL: Record<string, DiscountType> = {
  'نسبة مئوية': 'Percentage',
  'نسبة': 'Percentage',
  'Percentage': 'Percentage',
  'مبلغ ثابت': 'FixedAmount',
  'مبلغ': 'FixedAmount',
  'Fixed Amount': 'FixedAmount',
  'FixedAmount': 'FixedAmount',
};

/** بيحوّل أي شكل (كود، نص مترجم، رقم) لـ DiscountType */
export function toDiscountType(value: unknown): DiscountType {
  // رقم: بنفترض ترتيب الـ enum في Swagger (Percentage = 0). لو الباك مبتدئ من 1، قوليلي
  if (typeof value === 'number') return DISCOUNT_TYPES[value] ?? 'Percentage';

  const raw = String(value ?? '').replace(/^DiscountType_/, '').trim();

  if ((DISCOUNT_TYPES as string[]).includes(raw)) return raw as DiscountType;
  if (DISCOUNT_TYPE_BY_LABEL[raw]) return DISCOUNT_TYPE_BY_LABEL[raw];

  // مقارنة من غير مسافات ولا حروف كبيرة/صغيرة
  const lower = raw.replace(/\s+/g, '').toLowerCase();
  const match = DISCOUNT_TYPES.find((t) => t.toLowerCase() === lower);
  if (match) return match;

  console.warn('Unknown discount type from API:', value);
  return 'Percentage';
}