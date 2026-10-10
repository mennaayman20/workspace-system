import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import {
  LucideAngularModule, Package, Plus, Pencil, Trash2, X, RotateCcw, Power,
  Percent,
} from 'lucide-angular';

import { PackageService } from './package.service';
import {
  PACKAGE_TYPES, PACKAGE_TYPE_LABELS, PackageItem, PackagePayload, PackageType,
} from './Ipackage';
import { LanguageService } from '../../core/services/lang.service'; // عدلي المسار حسب مشروعك

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, RouterLinkActive,LucideAngularModule],
  templateUrl: './packages.component.html',
})
export class PackagesComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly packageService = inject(PackageService);
  private readonly toastr = inject(ToastrService);
  public readonly langService = inject(LanguageService); // حقن خدمة اللغة

  readonly PercentIcon = Percent;
  readonly PackageIcon = Package;
  readonly PlusIcon = Plus;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly CloseIcon = X;
  readonly RestoreIcon = RotateCcw;
  readonly PowerIcon = Power;

  readonly typeOptions = PACKAGE_TYPES;
  readonly typeLabels = PACKAGE_TYPE_LABELS;

  readonly packages = this.packageService.packages;
  readonly count = computed(() => this.packages().length);

  readonly isLoading = signal(false);
  readonly isFormOpen = signal(false);
  readonly isSaving = signal(false);
  readonly editing = signal<PackageItem | null>(null);
  readonly pendingDelete = signal<PackageItem | null>(null);
  readonly busyId = signal<number | null>(null);

  // حقل الاسم الوهمي اللي هيربط بالـ HTML
  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    packageType: this.fb.control<PackageType>('WorkspaceHours'),
    totalHours: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    durationDays: this.fb.control<number | null>(null, Validators.min(1)),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.packageService.getPackages().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.toastr.error('تعذر تحميل الباقات');
      },
    });
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({ packageType: 'WorkspaceHours' });
    this.isFormOpen.set(true);
  }

openEdit(p: PackageItem) {
  this.editing.set(p);
  const isAr = this.langService.currentLang() === 'ar';
  
  // اختيار الاسم والوصف المتاحين بناءً على اللغة الحالية
  // لو الاسم باللغة الحالية غير موجود، يأخذ الاسم باللغة الثانية كـ Fallback
  const existingName = isAr 
    ? (p.nameAr || p.nameEn || '') 
    : (p.nameEn || p.nameAr || '');

  const existingDesc = isAr 
    ? (p.descriptionAr || p.descriptionEn || '') 
    : (p.descriptionEn || p.descriptionAr || '');

  this.form.patchValue({
    name: existingName,
    description: existingDesc,
    packageType: p.packageType,
    totalHours: p.totalHours,
    durationDays: p.durationDays,
    price: p.price,
  });

  this.isFormOpen.set(true);
}

  closeForm() {
    if (this.isSaving()) return;
    this.isFormOpen.set(false);
  }

save() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const v = this.form.getRawValue();
  const enteredName = v.name.trim();
  const enteredDesc = v.description.trim() || null;

  // إرسال الاسم المدخل للحقل الإجباري في الباك إند، ونفس القيمة للحقل الآخر كـ Fallback
  const payload: PackagePayload = {
    nameAr: enteredName,
    nameEn: enteredName, // يمنع خطأ "The NameEn field is required"
    descriptionAr: enteredDesc,
    descriptionEn: enteredDesc,
    packageType: v.packageType,
    totalHours: v.totalHours!,
    durationDays: v.durationDays,
    price: v.price!,
  };

  const current = this.editing();
  const request$ = current
    ? this.packageService.update(current.id, payload)
    : this.packageService.create(payload);

  this.isSaving.set(true);
  request$.subscribe({
    next: () => {
      this.isSaving.set(false);
      this.isFormOpen.set(false);
      this.toastr.success(current ? 'تم تعديل الباقة' : 'تمت إضافة الباقة');
      this.load();
    },
    error: (err) => {
      this.isSaving.set(false);
      this.toastr.error(err?.error?.message || 'فشل حفظ الباقة');
    },
  });
}
  toggleActive(p: PackageItem) {
    this.runAction(
      p.id,
      p.isActive ? this.packageService.deactivate(p.id) : this.packageService.activate(p.id),
      p.isActive ? 'تم إيقاف الباقة' : 'تم تفعيل الباقة',
    );
  }

  restore(p: PackageItem) {
    this.runAction(p.id, this.packageService.restore(p.id), 'تمت استعادة الباقة');
  }

 askDelete(p: PackageItem) {
    console.log('Delete clicked for package:', p); // للتأكد في الـ Console
    this.pendingDelete.set(p);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const p = this.pendingDelete();
    if (!p) return;

    this.busyId.set(p.id);
    this.packageService.delete(p.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف الباقة بنجاح');
        this.load(); // إعادة تحميل القائمة
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || 'فشل حذف الباقة');
      },
    });
  }

  // عرض الاسم باللغة المفعلة أولاً، وإذا لم توجد يُعرض الاسم باللغة الثانية
  displayName(p: PackageItem): string {
    const isAr = this.langService.currentLang() === 'ar';
    if (isAr) {
      return p.nameAr || p.nameEn || `باقة #${p.id}`;
    }
    return p.nameEn || p.nameAr || `Package #${p.id}`;
  }

  // عرض الوصف باللغة المفعلة أولاً
  displayDescription(p: PackageItem): string | null {
    const isAr = this.langService.currentLang() === 'ar';
    return isAr ? (p.descriptionAr || p.descriptionEn) : (p.descriptionEn || p.descriptionAr);
  }

  private runAction(id: number, request$: Observable<void>, successMsg: string, done?: () => void) {
    this.busyId.set(id);
    request$.subscribe({
      next: () => {
        this.busyId.set(null);
        this.toastr.success(successMsg);
        done?.();
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || 'حصل خطأ، حاولي تاني');
      },
    });
  }
}