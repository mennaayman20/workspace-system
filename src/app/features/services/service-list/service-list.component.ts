import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { LucideAngularModule, ConciergeBell, Plus, X, Pencil, Trash2, Save, SparklesIcon, BriefcaseIcon } from 'lucide-angular';
import { ServiceCatalogService } from '../service-catalog.service';
import { CreateServiceCommand, ServiceItem, ServiceTranslations } from '../Iservice';
import { PortalDirective } from '../../../shared/directives/portal.directive';
import {
  DataTableComponent, TableAction, TableActionEvent, TableColumn,
} from '../../../shared/components/data-table';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule, PortalDirective,
    DataTableComponent,
  ],
  templateUrl: './service-list.component.html',
})
export class ServiceListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  serviceCatalog = inject(ServiceCatalogService);

readonly BriefcaseIcon=BriefcaseIcon;

  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;

  // ---------- إعداد الجدول ----------
  readonly columns: TableColumn<ServiceItem>[] = [
    { key: 'name', header: 'الخدمة', align: 'start', cellClass: 'font-bold text-slate-900', value: (s) => this.displayName(s) },
    { key: 'description', header: 'الوصف', align: 'start', cellClass: 'text-slate-600' },
    { key: 'price', header: 'السعر', type: 'currency', currency: 'EGP', sortable: true },
    { key: 'isActive', header: 'الحالة', type: 'status', trueLabel: 'نشطة', falseLabel: 'غير نشطة', sortable: true },
  ];

  readonly actions: TableAction<ServiceItem>[] = [
    { key: 'edit', label: 'تعديل', icon: Pencil, tone: 'primary' },
    { key: 'delete', label: 'حذف', icon: Trash2, tone: 'danger' },
  ];

  onAction(e: TableActionEvent<ServiceItem>) {
    if (e.key === 'edit') this.editService(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

  isFormOpen = signal(false);
  selectedService = signal<ServiceItem | null>(null);
  isSubmitting = signal(false);
  isLoadingTranslations = signal(false);

  // تأكيد الحذف
  serviceToDelete = signal<ServiceItem | null>(null);
  isDeleting = signal(false);

  form = this.fb.nonNullable.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100)]],
    descriptionAr: [''],
    descriptionEn: [''],
price: [null as number | null, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  ngOnInit() {
    this.serviceCatalog.getServices().subscribe({
      error: () => this.toastr.error('تعذر تحميل الخدمات'),
    });
  }

  displayName(s: ServiceItem): string {
    return s.name ?? s.nameAr ?? s.nameEn ?? '';
  }

  isFieldInvalid(name: 'nameAr' | 'nameEn' | 'price'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  openAddForm() {
    this.selectedService.set(null);
    this.form.reset({
  nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', price: null, isActive: true,
});
    this.isFormOpen.set(true);
  }

  editService(s: ServiceItem) {
    this.selectedService.set(s);
    this.form.reset({
      nameAr: s.nameAr ?? '',
      nameEn: s.nameEn ?? '',
      descriptionAr: s.descriptionAr ?? '',
      descriptionEn: s.descriptionEn ?? '',
      price: s.price,
      isActive: s.isActive,
    });
    this.isFormOpen.set(true);

    // لو الليست مرجّعتش اللغتين، نجيبهم من الباك
    if (s.nameAr == null || s.nameEn == null) {
      this.isLoadingTranslations.set(true);
      this.serviceCatalog.getTranslations(s.id).subscribe({
        next: (t: ServiceTranslations) => {
          this.form.patchValue(t);
          this.isLoadingTranslations.set(false);
        },
        error: () => {
          this.isLoadingTranslations.set(false);
          this.toastr.error('تعذر تحميل ترجمات الخدمة');
        },
      });
    }
  }

  resetForm() {
    this.isFormOpen.set(false);
    this.selectedService.set(null);
  }

  onSubmit() {
    if (this.form.invalid || this.isLoadingTranslations()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const base: CreateServiceCommand = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      price: Number(v.price),
      isActive: v.isActive,
    };

    const editing = this.selectedService();
    const request$ = editing
      ? this.serviceCatalog.updateService(editing.id, { id: editing.id, ...base })
      : this.serviceCatalog.createService(base);

    this.isSubmitting.set(true);
    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastr.success(editing ? 'تم تحديث الخدمة بنجاح' : 'تمت إضافة الخدمة بنجاح');
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastr.error(err?.error?.message || 'حدث خطأ أثناء الحفظ');
      },
    });
  }

  // ===== الحذف =====
  askDelete(s: ServiceItem) {
    this.serviceToDelete.set(s);
  }

  cancelDelete() {
    if (this.isDeleting()) return;
    this.serviceToDelete.set(null);
  }

  confirmDelete() {
    const s = this.serviceToDelete();
    if (!s) return;

    this.isDeleting.set(true);
    this.serviceCatalog.deleteService(s.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.serviceToDelete.set(null);
        this.toastr.success('تم حذف الخدمة');
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(err?.error?.message || 'فشل حذف الخدمة');
      },
    });
  }
}