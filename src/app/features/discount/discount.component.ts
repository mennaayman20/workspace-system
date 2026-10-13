import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Percent, Plus, Pencil, Trash2, RotateCcw, Package } from 'lucide-angular';

import { DiscountService } from './discount.service';
import { Discount, DISCOUNT_TYPE_LABELS } from './Idiscount';
import { DiscountFormModalComponent } from './discount-form-modal/discount-form-modal';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule, RouterLink, RouterLinkActive,
    DiscountFormModalComponent,ConfirmDialogComponent,TranslatePipe
  ],
  templateUrl: './discount.component.html',
})
export class DiscountsComponent implements OnInit {
  private discountService = inject(DiscountService);
  private toastr = inject(ToastrService);

  readonly PackageIcon = Package;
  readonly PercentIcon = Percent;
  readonly PlusIcon = Plus;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly RestoreIcon = RotateCcw;

  readonly typeLabels = DISCOUNT_TYPE_LABELS;

  discounts = this.discountService.discounts;
  isLoading = this.discountService.isLoading;
  count = computed(() => this.discounts().length);

  // Form modal
  isFormOpen = signal(false);
  editing = signal<Discount | null>(null);

  // Delete confirmation
  pendingDelete = signal<Discount | null>(null);
  busyId = signal<number | null>(null);

  ngOnInit() {
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.discountService.getDiscounts().subscribe({
      error: () => this.toastr.error('تعذر تحميل الخصومات'),
    });
  }

  displayName(d: Discount): string {
    return d.name || d.nameAr || d.nameEn || `#${d.id}`;
  }

  displayDescription(d: Discount): string | null {
    return d.description || d.descriptionAr || d.descriptionEn || null;
  }

  // ===== الفورم =====
  openCreate() {
    this.editing.set(null);
    this.isFormOpen.set(true);
  }

  openEdit(d: Discount) {
    this.editing.set(d);
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.editing.set(null);
  }

  // ===== الحذف والاستعادة =====
  askDelete(d: Discount) {
    this.pendingDelete.set(d);
  }

  cancelDelete() {
    if (this.busyId() !== null) return;
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const d = this.pendingDelete();
    if (!d) return;

    this.busyId.set(d.id);
    this.discountService.deleteDiscount(d.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف الخصم بنجاح');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(this.errorMessage(err, 'فشل حذف الخصم'));
      },
    });
  }

  restore(d: Discount) {
    this.busyId.set(d.id);
    this.discountService.restoreDiscount(d.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toastr.success('تمت استعادة الخصم');
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(this.errorMessage(err, 'فشلت استعادة الخصم'));
      },
    });
  }

  // ===== مساعدات للعرض =====
  status(d: Discount): { label: string; cls: string } {
  const now = Date.now();

  if (d.isDeleted) {
    return {
      label: 'DISCOUNTS.STATUS.DELETED',
      cls: 'bg-slate-100 text-slate-500'
    };
  }

  if (!d.isActive) {
    return {
      label: 'DISCOUNTS.STATUS.INACTIVE',
      cls: 'bg-amber-50 text-amber-600'
    };
  }

  if (d.endDate && new Date(d.endDate).getTime() < now) {
    return {
      label: 'DISCOUNTS.STATUS.EXPIRED',
      cls: 'bg-rose-50 text-rose-600'
    };
  }

  if (d.startDate && new Date(d.startDate).getTime() > now) {
    return {
      label: 'DISCOUNTS.STATUS.NOT_STARTED',
      cls: 'bg-blue-50 text-blue-600'
    };
  }

  return {
    label: 'DISCOUNTS.STATUS.ACTIVE',
    cls: 'bg-emerald-50 text-emerald-600'
  };
}

  private errorMessage(err: any, fallback: string): string {
    if (typeof err?.error?.message === 'string') return err.error.message;
    const errors = err?.error?.errors;
    if (Array.isArray(errors) && errors[0]) return String(errors[0]);
    return fallback;
  }
}