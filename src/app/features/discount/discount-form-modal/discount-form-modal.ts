import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LucideAngularModule, Percent, X, Save, FileText, CalendarDays, Banknote } from 'lucide-angular';

import { DiscountService } from '../discount.service';
import { CreateDiscountCommand, Discount, DiscountType, DISCOUNT_TYPE_LABELS , toDiscountType } from '../Idiscount';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-discount-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule,
    DatePickerModule, SelectButtonModule, ToggleSwitchModule,
    TranslatePipe
  ],
  templateUrl: './discount-form-modal.html',
})
export class DiscountFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly discountService = inject(DiscountService);
  private readonly toastr = inject(ToastrService);

  discount = input<Discount | null>(null);
  saved = output<void>();
  closeModal = output<void>();

  readonly PercentIcon = Percent;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly TextIcon = FileText;
  readonly CalendarIcon = CalendarDays;

  readonly isSaving = signal(false);
  readonly isLoadingTranslations = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly typeOptions: { label: string; value: DiscountType }[] = [
    { label: DISCOUNT_TYPE_LABELS['Percentage'], value: 'Percentage' },
    { label: DISCOUNT_TYPE_LABELS['FixedAmount'], value: 'FixedAmount' },
  ];

    readonly BanknoteIcon = Banknote;

  readonly typeCards: { value: DiscountType; label: string; hint: string; icon: any; tone: string }[] = [
    { value: 'Percentage',  label: 'نسبة مئوية', hint: 'مثال: 10% من الفاتورة',    icon: Percent,  tone: 'bg-amber-100 text-amber-600' },
    { value: 'FixedAmount', label: 'مبلغ ثابت',  hint: 'مثال: 50 ج.م من الفاتورة', icon: Banknote, tone: 'bg-emerald-100 text-emerald-600' },
  ];

  selectType(type: DiscountType): void {
    const c = this.form.controls;
    c.type.setValue(type);
    c.type.markAsDirty();
    // لو رجعتي لنسبة والقيمة أكبر من 100، نظبطها
    if (type === 'Percentage' && (c.value.value ?? 0) > 100) c.value.setValue(100);
  }

  /** معاينة توضيحية على فاتورة 200 ج.م */
  get preview(): { base: number; discount: number; final: number } | null {
    const v = Number(this.form.controls.value.value);
    if (!v || v <= 0) return null;

    const base = 200;
    const raw = this.isPercent ? (base * Math.min(v, 100)) / 100 : Math.min(v, base);
    const discount = Number(raw.toFixed(2));
    return { base, discount, final: Number((base - discount).toFixed(2)) };
  }

  readonly form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    type: this.fb.control<DiscountType>('Percentage', Validators.required),
    value: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    isActive: [true],
    startDate: this.fb.control<Date | null>(null),
    endDate: this.fb.control<Date | null>(null),
  });

  get isEdit(): boolean {
    return !!this.discount();
  }

  get isPercent(): boolean {
    return this.form.controls.type.value === 'Percentage';
  }

  ngOnInit(): void {
    const d = this.discount();
    if (!d) return;

    // بيانات فورية من الـ List
    this.form.patchValue({
      nameAr: d.nameAr ?? '',
      nameEn: d.nameEn ?? '',
      descriptionAr: d.descriptionAr ?? '',
      descriptionEn: d.descriptionEn ?? '',
      type: d.type,
      value: d.value,
      isActive: d.isActive,
      startDate: this.toDate(d.startDate),
      endDate: this.toDate(d.endDate),
    });

    // الاسم والوصف باللغتين
    this.isLoadingTranslations.set(true);
    this.discountService.getTranslations(d.id).subscribe({
      next: (t) => {
        this.form.patchValue(t);
        this.isLoadingTranslations.set(false);
      },
      error: () => this.isLoadingTranslations.set(false),
    });
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  submit(): void {
    if (this.isSaving() || this.isLoadingTranslations()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (v.type === 'Percentage' && (v.value ?? 0) > 100) {
      this.toastr.error('نسبة الخصم لا يمكن أن تزيد عن 100%');
      return;
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      this.toastr.error('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية');
      return;
    }

    const start = this.toDateOnly(v.startDate);
    const end = this.toDateOnly(v.endDate);

    const command: CreateDiscountCommand = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      type: v.type,
      value: Number(v.value),
      isActive: v.isActive,
      startDate: start ? `${start}T00:00:00` : null,
      endDate: end ? `${end}T23:59:59` : null,
    };

    const current = this.discount();
    const request$ = current
      ? this.discountService.updateDiscount(current.id, { id: current.id, ...command })
      : this.discountService.createDiscount(command);

    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success(current ? 'تم تعديل الخصم بنجاح' : 'تمت إضافة الخصم بنجاح');
        this.saved.emit();
      },
      error: (err) => {
        const msg = this.extractError(err, 'فشل حفظ الخصم');
        this.isSaving.set(false);
        this.errorMessage.set(msg);
        this.toastr.error(msg);
      },
    });
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.closeModal.emit();
  }

  // ---------- مساعدات ----------
  private toDate(value?: string | null): Date | null {
    if (!value) return null;
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toDateOnly(date: Date | null): string | null {
    if (!date) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    const errors = err?.error?.errors;
    if (Array.isArray(errors) && errors[0]) return String(errors[0]);
    if (errors && typeof errors === 'object') {
      const first = (Object.values(errors).flat() as string[])[0];
      if (first) return first;
    }
    if (typeof err?.error?.title === 'string') return err.error.title;
    return fallback;
  }
}