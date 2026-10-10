export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

// ---------- Plans ----------
export interface PricingPlan {
  id: number;
  name: string;                     // المترجم (للعرض)
  description?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive: boolean;
}
export interface PricingPlanQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}
/** نفس CreatePricingPlanCommand (والتعديل بيبعت نفس الشكل) */
export interface PricingPlanPayload {
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
}

export interface PlanTranslations {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}
// ---------- Rules ----------
/** الأنواع اللي الباك إند بيحسب بيها فعلًا في الـ checkout. */
export const SUPPORTED_RULE_TYPES = [
  'HourlyRate',
  'MinimumCharge',
  'FullDayMaximum',
  'RoundUp',
  'RoundDown',
] as const;

export type SupportedRuleType = (typeof SUPPORTED_RULE_TYPES)[number];

export interface PricingRule {
  id: number;
  pricingPlanId: number;
  workspaceTypeId: number;
  /** string عشان الـ API ممكن يرجّع أنواع تانية غير مدعومة (WeekendPricing...) */
  ruleType: string;
  value: number | null;
  startDate: string | null;
  endDate: string | null;
  dayOfWeek: string | null;
  isActive: boolean;
}

export type PricingRulePayload = Omit<PricingRule, 'id'>;

// ---------- شكل الفورم (اللي المستخدم بيشوفه) ----------
export type RoundingMode = 'none' | 'up' | 'down';

export interface TypePricingConfig {
  hourlyRate: number | null;
  minimumCharge: number | null;
  fullDayMaximum: number | null;
  rounding: { mode: RoundingMode; minutes: number | null };
}

export type RuleOperation =
  | { kind: 'create'; payload: PricingRulePayload }
  | { kind: 'update'; id: number; payload: PricingRulePayload }
  | { kind: 'delete'; id: number };
