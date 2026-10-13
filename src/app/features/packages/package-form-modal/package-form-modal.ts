import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  LucideAngularModule, Package, X, Save, FileText, Briefcase, Users, Layers, Wallet,
} from 'lucide-angular';

import { PackageService } from '../package.service';
import { PackageItem, PackagePayload, PackageType } from '../Ipackage';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-package-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule,TranslatePipe
  ],
  templateUrl: './package-form-modal.html',
})
export class PackageFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly packageService = inject(PackageService);
  private readonly toastr = inject(ToastrService);

  pkg = input<PackageItem | null>(null);
  saved = output<void>();
  closeModal = output<void>();

  readonly PackageIcon = Package;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly TextIcon = FileText;
  readonly WalletIcon = Wallet;

  readonly isSaving = signal(false);
  readonly isLoadingTranslations = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly typeCards: {
    value: PackageType; label: string; hint: string; icon: any; tone: string;
  }[] = [
    { value: 'WorkspaceHours',   label: 'مساحة عمل',     hint: 'ساعات على المساحات',     icon: Briefcase, tone: 'bg-blue-100 text-blue-600' },
    { value: 'MeetingRoomHours', label: 'قاعة اجتماعات', hint: 'ساعات على القاعات',      icon: Users,     tone: 'bg-purple-100 text-purple-600' },
    { value: 'Mixed',            label: 'مختلطة',        hint: 'تنفع للنوعين',            icon: Layers,    tone: 'bg-emerald-100 text-emerald-600' },
  ];

  readonly form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    packageType: this.fb.control<PackageType>('WorkspaceHours', Validators.required),
    totalHours: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    durationDays: this.fb.control<number | null>(null, [Validators.min(1)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  get isEdit(): boolean {
    return !!this.pkg();
  }

  /** سعر الساعة التقريبي: توضيح للمستخدم وهو بيكتب */
  get pricePerHour(): number | null {
    const hours = Number(this.form.controls.totalHours.value);
    const price = Number(this.form.controls.price.value);
    if (!hours || hours <= 0 || !price || price <= 0) return null;
    return Number((price / hours).toFixed(2));
  }

  ngOnInit(): void {
    const p = this.pkg();
    if (!p) return;

    // بيانات فورية من الـ List
    this.form.patchValue({
      nameAr: p.nameAr ?? '',
      nameEn: p.nameEn ?? '',
      descriptionAr: p.descriptionAr ?? '',
      descriptionEn: p.descriptionEn ?? '',
      packageType: p.packageType,
      totalHours: p.totalHours,
      durationDays: p.durationDays,
      price: p.price,
    });

    // الاسم والوصف باللغتين
    this.isLoadingTranslations.set(true);
    this.packageService.getTranslations(p.id).subscribe({
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

  selectType(type: PackageType): void {
    this.form.controls.packageType.setValue(type);
    this.form.controls.packageType.markAsDirty();
  }

  submit(): void {
    if (this.isSaving() || this.isLoadingTranslations()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: PackagePayload = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      packageType: v.packageType,
      totalHours: Number(v.totalHours),
      durationDays: v.durationDays ? Number(v.durationDays) : null,
      price: Number(v.price),
    };

    const current = this.pkg();
    const request$ = current
      ? this.packageService.update(current.id, payload)
      : this.packageService.create(payload);

    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastr.success(current ? 'تم تعديل الباقة بنجاح' : 'تمت إضافة الباقة بنجاح');
        this.saved.emit();
      },
      error: (err) => {
        const msg = this.extractError(err, 'فشل حفظ الباقة');
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