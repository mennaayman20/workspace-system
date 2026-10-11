import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import {
  LucideAngularModule, Package, Plus, Pencil, Trash2, RotateCcw, Power, Percent,
} from 'lucide-angular';

import { PackageService } from './package.service';
import { PACKAGE_TYPE_LABELS, PackageItem, PackageType } from './Ipackage';
import { LanguageService } from '../../core/services/lang.service'; // عدلي المسار حسب مشروعك
import { PackageFormModalComponent } from './package-form-modal/package-form-modal';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [
    CurrencyPipe, RouterLink, RouterLinkActive, LucideAngularModule,
    PackageFormModalComponent,ConfirmDialogComponent
  ],
  templateUrl: './packages.component.html',
})
export class PackagesComponent {
  private readonly packageService = inject(PackageService);
  private readonly toastr = inject(ToastrService);
  readonly langService = inject(LanguageService);

  readonly PercentIcon = Percent;
  readonly PackageIcon = Package;
  readonly PlusIcon = Plus;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly RestoreIcon = RotateCcw;
  readonly PowerIcon = Power;

  readonly isAr = computed(() => this.langService.currentLang() === 'ar');

  readonly packages = this.packageService.packages;
  readonly count = computed(() => this.packages().length);

  readonly isLoading = signal(false);

  // Form modal
  readonly isFormOpen = signal(false);
  readonly editing = signal<PackageItem | null>(null);

  // Delete confirmation
  readonly pendingDelete = signal<PackageItem | null>(null);
  readonly busyId = signal<number | null>(null);

  constructor() {
    // بيحمّل أول مرة، وبيعيد التحميل لما اللغة تتغير (الباك بيترجم الاسم حسب اللغة)
    effect(() => {
      this.langService.currentLang();
      untracked(() => this.load());
    });
  }

  load() {
    this.isLoading.set(true);
    this.packageService.getPackages().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.toastr.error(this.isAr() ? 'تعذر تحميل الباقات' : 'Failed to load packages');
      },
    });
  }

  // ---------- الفورم ----------
  openCreate() {
    this.editing.set(null);
    this.isFormOpen.set(true);
  }

  openEdit(p: PackageItem) {
    this.editing.set(p);
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.editing.set(null);
  }

  onSaved() {
    this.closeForm();
    this.load();
  }

  // ---------- الحذف ----------
  askDelete(p: PackageItem) {
    this.pendingDelete.set(p);
  }

  cancelDelete() {
    if (this.busyId() !== null) return;
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
        this.toastr.success(this.isAr() ? 'تم حذف الباقة بنجاح' : 'Package deleted');
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || (this.isAr() ? 'فشل حذف الباقة' : 'Failed to delete package'));
      },
    });
  }

  // ---------- التفعيل والاستعادة ----------
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

  // ---------- العرض ----------
  /** الباك بيرجّع name مترجم، وبنرجع للحقول الخام لو مش موجود */
  displayName(p: PackageItem): string {
    const fallback = this.isAr() ? p.nameAr || p.nameEn : p.nameEn || p.nameAr;
    return p.name || fallback || (this.isAr() ? `باقة #${p.id}` : `Package #${p.id}`);
  }

  displayDescription(p: PackageItem): string | null {
    const fallback = this.isAr()
      ? p.descriptionAr || p.descriptionEn
      : p.descriptionEn || p.descriptionAr;
    return p.description || fallback || null;
  }

  typeLabel(t: PackageType): string {
    return PACKAGE_TYPE_LABELS[t]?.[this.isAr() ? 'ar' : 'en'] ?? t;
  }

  private runAction(id: number, request$: Observable<void>, successMsg: string) {
    this.busyId.set(id);
    request$.subscribe({
      next: () => {
        this.busyId.set(null);
        this.toastr.success(successMsg);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || 'حصل خطأ، حاولي تاني');
      },
    });
  }
}