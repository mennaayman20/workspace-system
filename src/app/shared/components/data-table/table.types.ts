export type ColumnType =
  | 'text' | 'mono' | 'currency' | 'date' | 'datetime' | 'status' | 'badge';
export type ActionTone = 'primary' | 'danger' | 'warning' | 'success' | 'neutral';

/** نوع فلتر العمود: text = حقل بحث | select = قايمة | date = نطاق تواريخ | none = بدون فلتر */
export type ColumnFilterType = 'text' | 'select' | 'date' | 'none';

export interface FilterOption {
  label: string;
  /** القيمة بتتقارن كنص مع قيمة الخلية */
  value: string;
}

export interface BadgeStyle {
  label: string;
  /** كلاسات Tailwind للبادج، استخدمي BADGE.blue وهكذا */
  class: string;
}

/** ألوان جاهزة للبادجات */
export const BADGE = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-rose-100 text-rose-700',
  amber:  'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  slate:  'bg-slate-100 text-slate-600',
} as const;

export interface TableColumn<T = any> {
  /** اسم الحقل في الداتا (بيدعم nested زي 'company.name'). مهم للترتيب والبحث */
  key: string;
  header: string;
  type?: ColumnType;
  sortable?: boolean;
  /** يدخل في البحث؟ الافتراضي: آه، إلا لو العمود له value أو نوعه status */
  searchable?: boolean;
  width?: string;
  /** الافتراضي 'center' */
  align?: 'start' | 'center' | 'end';
  /** بيظهر لو القيمة فاضية (الافتراضي '-') */
  fallback?: string;
  /** لو الحقل محسوب، مثال: row => row.floor + ' - ' + row.location */
  value?: (row: T) => unknown;
  headerClass?: string;
  cellClass?: string;

  // ===== فلتر العمود (بيشتغل لما columnFilters = true) =====
  /**
   * الافتراضي حسب نوع العمود:
   * date/datetime → 'date' | status/badge → 'select' | غير كده → 'text'
   * (أو 'none' لو searchable === false)
   */
  filter?: ColumnFilterType;
  /** اختيارات فلتر select. الافتراضي: من badges أو من trueLabel/falseLabel */
  filterOptions?: FilterOption[];
  /** placeholder الفلتر. الافتراضي 'بحث' */
  filterPlaceholder?: string;

  // currency
  currency?: string;      // الافتراضي EGP

  // status (boolean)
  trueLabel?: string;     // الافتراضي 'نشط'
  falseLabel?: string;    // الافتراضي 'غير نشط'

  // badge: القيمة → الشكل
  badges?: Record<string, BadgeStyle>;
}

export interface TableAction<T = any> {
  key: string;
  label: string;
  icon: any;              // أيقونة lucide
  tone?: ActionTone;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableActionEvent<T = any> {
  key: string;
  row: T;
}

/** قيمة فلتر: نص | نطاق تواريخ [من، إلى?] | null */
export type ColumnFilterValue = string | Date[] | null | undefined;
export type ColumnFilters = Record<string, ColumnFilterValue>;