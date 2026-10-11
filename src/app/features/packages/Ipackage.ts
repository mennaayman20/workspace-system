export type PackageType = 'WorkspaceHours' | 'MeetingRoomHours' | 'Mixed';

export interface PackageItem {
  id: number;
  name?: string | null;              // المترجم (للعرض)
  description?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  packageType: PackageType;
  totalHours: number;
  durationDays: number | null;
  price: number;
  isActive: boolean;
  isDeleted: boolean;
  customerCount?: number;
}

/** نفس CreatePackageCommand (والتعديل بيبعت نفس الشكل) */
export interface PackagePayload {
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  packageType: PackageType;
  totalHours: number;
  durationDays: number | null;
  price: number;
}

export interface PackageTranslations {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const PACKAGE_TYPES: PackageType[] = ['WorkspaceHours', 'MeetingRoomHours', 'Mixed'];

export const PACKAGE_TYPE_LABELS: Record<PackageType, { ar: string; en: string }> = {
  WorkspaceHours:   { ar: 'ساعات مساحة عمل',     en: 'Workspace hours' },
  MeetingRoomHours: { ar: 'ساعات قاعة اجتماعات', en: 'Meeting room hours' },
  Mixed:            { ar: 'مختلطة',              en: 'Mixed' },
};

/** النصوص اللي الباك بيرجّعها (مترجمة) → الكود الثابت. راجعيها مع الـ response الحقيقي */
export const PACKAGE_TYPE_BY_LABEL: Record<string, PackageType> = {
  'ساعات مساحة العمل': 'WorkspaceHours',
  'ساعات مساحة عمل': 'WorkspaceHours',
  'ساعات قاعة الاجتماعات': 'MeetingRoomHours',
  'ساعات قاعة اجتماعات': 'MeetingRoomHours',
  'مختلطة': 'Mixed',
  'Workspace Hours': 'WorkspaceHours',
  'Meeting Room Hours': 'MeetingRoomHours',
  'Mixed': 'Mixed',
};