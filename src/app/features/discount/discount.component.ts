import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Percent, Plus, Pencil, Trash2, RotateCcw, X, Package } from 'lucide-angular';

import { DiscountService } from './discount.service';
import {
  Discount,
  DiscountType,
  CreateDiscountCommand,
  DISCOUNT_TYPE_LABELS,
} from './Idiscount';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, RouterLink , RouterLinkActive],
  templateUrl: './discount.component.html',
})
export class DiscountsComponent implements OnInit {
  private discountService = inject(DiscountService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

readonly PackageIcon=Package;
  readonly PercentIcon = Percent;
  readonly PlusIcon = Plus;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly RestoreIcon = RotateCcw;
  readonly CloseIcon = X;

  readonly typeLabels = DISCOUNT_TYPE_LABELS;
  readonly typeOptions: DiscountType[] = ['Percentage', 'FixedAmount'];

  discounts = this.discountService.discounts;
  isLoading = this.discountService.isLoading;
  count = computed(() => this.discounts().length);

  isFormOpen = signal(false);
  editing = signal<Discount | null>(null);
  isSaving = signal(false);
  pendingDelete = signal<Discount | null>(null);
  busyId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['Percentage' as DiscountType, Validators.required],
    value: [0, [Validators.required, Validators.min(0.01)]],
    isActive: [true],
    startDate: [''],
    endDate: [''],
  });

  ngOnInit() {
    this.loadDiscounts();
  }

  loadDiscounts() {
    this.discountService.getDiscounts().subscribe({
      error: () => this.toastr.error('تعذر تحميل الخصومات'),
    });
  }

  // ===== الفورم =====
  openCreate() {
    this.editing.set(null);
    this.form.reset({
      name: '',
      type: 'Percentage',
      value: 0,
      isActive: true,
      startDate: '',
      endDate: '',
    });
    this.isFormOpen.set(true);
  }

  openEdit(d: Discount) {
    this.editing.set(d);
    this.form.reset({
      name: d.name,
      type: d.type,
      value: d.value,
      isActive: d.isActive,
      startDate: this.dateOnly(d.startDate),
      endDate: this.dateOnly(d.endDate),
    });
    this.isFormOpen.set(true);
  }

  closeForm() {
    if (this.isSaving()) return;
    this.isFormOpen.set(false);
    this.editing.set(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (v.type === 'Percentage' && v.value > 100) {
      this.toastr.error('نسبة الخصم لا يمكن أن تزيد عن 100%');
      return;
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      this.toastr.error('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية');
      return;
    }

    const command: CreateDiscountCommand = {
      name: v.name.trim(),
      type: v.type,
      value: Number(v.value),
      isActive: v.isActive,
      startDate: v.startDate ? `${v.startDate}T00:00:00` : null,
      endDate: v.endDate ? `${v.endDate}T23:59:59` : null,
    };

    const current = this.editing();
    const request$ = current
      ? this.discountService.updateDiscount(current.id, { id: current.id, ...command })
      : this.discountService.createDiscount(command);

    this.isSaving.set(true);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success(current ? 'تم تعديل الخصم' : 'تمت إضافة الخصم');
        this.isFormOpen.set(false);
        this.editing.set(null);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastr.error(this.errorMessage(err, 'فشل حفظ الخصم'));
      },
    });
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
        this.toastr.success('تم حذف الخصم');
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
    if (d.isDeleted) return { label: 'محذوف', cls: 'bg-slate-100 text-slate-500' };
    if (!d.isActive) return { label: 'غير فعّال', cls: 'bg-amber-50 text-amber-600' };
    if (d.endDate && new Date(d.endDate).getTime() < now) {
      return { label: 'منتهي', cls: 'bg-rose-50 text-rose-600' };
    }
    if (d.startDate && new Date(d.startDate).getTime() > now) {
      return { label: 'لم يبدأ بعد', cls: 'bg-blue-50 text-blue-600' };
    }
    return { label: 'فعّال', cls: 'bg-emerald-50 text-emerald-600' };
  }

  private dateOnly(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private errorMessage(err: any, fallback: string): string {
    return err?.error?.message || err?.error?.errors?.[0] || fallback;
  }
}