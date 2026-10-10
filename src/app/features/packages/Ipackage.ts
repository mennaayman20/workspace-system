export type PackageType = 'WorkspaceHours' | 'MeetingRoomHours' | 'Mixed';

export interface PackageItem {
  id: number;
  nameEn: string | null;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  packageType: PackageType;
  totalHours: number;
  durationDays: number | null;
  price: number;
  isActive: boolean;
  isDeleted: boolean;
}

/** نفس CreatePackageCommand (والتعديل بيبعت نفس الشكل) */
export interface PackagePayload {
  nameEn: string | null;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  packageType: PackageType;
  totalHours: number;
  durationDays: number | null;
  price: number;
}

export const PACKAGE_TYPES: PackageType[] = ['WorkspaceHours', 'MeetingRoomHours', 'Mixed'];

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  WorkspaceHours: 'ساعات مساحة عمل',
  MeetingRoomHours: 'ساعات قاعة اجتماعات',
  Mixed: 'مختلطة',
};