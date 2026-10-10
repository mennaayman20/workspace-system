import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, ConciergeBell, Plus, X, Pencil, Trash2, Save } from 'lucide-angular';
import { ServiceCatalogService } from '../service-catalog.service';
import { ServiceItem } from '../Iservice';


@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './service-list.component.html',
})
export class ServiceListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  serviceCatalog = inject(ServiceCatalogService);

  readonly ServiceIcon = ConciergeBell;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;

  isFormOpen = signal(false);
  selectedService = signal<ServiceItem | null>(null);
  isSubmitting = signal(false);

  // تأكيد الحذف
  serviceToDelete = signal<ServiceItem | null>(null);
  isDeleting = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  ngOnInit() {
    this.serviceCatalog.getServices().subscribe({
      error: () => this.toastr.error('تعذر تحميل الخدمات'),
    });
  }

  openAddForm() {
    this.selectedService.set(null);
    this.form.reset({ name: '', description: '', price: 0, isActive: true });
    this.isFormOpen.set(true);
  }

  editService(s: ServiceItem) {
    this.selectedService.set(s);
    this.form.reset({
      name: s.name,
      description: s.description ?? '',
      price: s.price,
      isActive: s.isActive,
    });
    this.isFormOpen.set(true);
  }

  resetForm() {
    this.isFormOpen.set(false);
    this.selectedService.set(null);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const base = {
      name: v.name.trim(),
      description: v.description.trim() || null,
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