import { ChangeDetectionStrategy, Component, HostListener, computed, input, output } from '@angular/core';
import { LucideAngularModule, Trash2 } from 'lucide-angular';

import { PortalDirective } from '../../directives/portal.directive';

export type ConfirmTone = 'danger' | 'warning' | 'primary';

/** كلاسات Tailwind لازم تتكتب كاملة عشان تتلقط في الـ build */
const TONES: Record<ConfirmTone, { icon: string; button: string }> = {
  danger:  { icon: 'bg-red-50 text-red-500',     button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: 'bg-amber-50 text-amber-500', button: 'bg-amber-500 hover:bg-amber-600' },
  primary: { icon: 'bg-blue-50 text-blue-500',   button: 'bg-blue-600 hover:bg-blue-700' },
};

/**
 * ديالوج تأكيد مشترك (الافتراضي: تأكيد حذف).
 *
 * <app-confirm-dialog
 *   [open]="!!pendingDelete()"
 *   title="حذف المنتج"
 *   [itemName]="pendingDelete() ? displayName(pendingDelete()!) : ''"
 *   [loading]="isDeleting()"
 *   (confirmed)="confirmDelete()"
 *   (cancelled)="cancelDelete()" />
 *
 * محتوى مخصص: حطيه جوه التاج وهيظهر تحت الرسالة.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule, PortalDirective],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  /** ظاهر ولا لأ */
  readonly open = input.required<boolean>();

  readonly title = input('تأكيد الحذف');
  /** النص اللي قبل اسم العنصر */
  readonly message = input('هل أنت متأكد من حذف');
  /** اسم العنصر (بيظهر بخط عريض بين علامتين تنصيص). فاضي = مفيش اسم */
  readonly itemName = input('');
  /** سطر توضيحي اختياري تحت الرسالة */
  readonly description = input<string | null>(null);

  readonly confirmLabel = input('نعم، حذف');
  readonly loadingLabel = input('جاري الحذف...');
  readonly cancelLabel = input('إلغاء');

  /** أثناء التنفيذ: الأزرار بتتقفل والإغلاق بيتمنع */
  readonly loading = input(false);
  readonly tone = input<ConfirmTone>('danger');
  /** أيقونة lucide (الافتراضي سلة المهملات) */
  readonly icon = input<any>(Trash2);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly toneClasses = computed(() => TONES[this.tone()]);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onCancel();
  }

  onCancel(): void {
    if (!this.open() || this.loading()) return;
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (this.loading()) return;
    this.confirmed.emit();
  }
}