
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';

import {
  LucideAngularModule,
  Plus,
  X,
  Pencil,
  Trash2,
  Save,
  BriefcaseIcon,
} from 'lucide-angular';

import { ServiceCatalogService } from '../service-catalog.service';
import {
  CreateServiceCommand,
  ServiceItem,
  ServiceTranslations,
} from '../Iservice';

import { PortalDirective } from '../../../shared/directives/portal.directive';

import {
  DataTableComponent,
  TableAction,
  TableActionEvent,
  TableColumn,
} from '../../../shared/components/data-table';

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    DataTableComponent,
    ConfirmDialogComponent,
    TranslatePipe,
    // PortalDirective,
  ],
  templateUrl: './service-list.component.html',
})
export class ServiceListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private translate = inject(TranslateService);

  serviceCatalog = inject(ServiceCatalogService);

  readonly BriefcaseIcon = BriefcaseIcon;
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly EditIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;

  // ---------- إعداد الجدول ----------
  // بنبعت مفاتيح الترجمة، والـ DataTableComponent بيترجمها
  readonly columns: TableColumn<ServiceItem>[] = [
    {
      key: 'name',
      header: 'SERVICES.TABLE.NAME',
      align: 'start',
      cellClass: 'font-bold text-slate-900',
      value: (s) => this.displayName(s),
    },
    {
      key: 'description',
      header: 'SERVICES.TABLE.DESCRIPTION',
      align: 'start',
      cellClass: 'text-slate-600',
    },
    {
      key: 'price',
      header: 'SERVICES.TABLE.PRICE',
      type: 'currency',
      currency: 'EGP',
      sortable: true,
    },
    {
      key: 'isActive',
      header: 'SERVICES.TABLE.STATUS',
      type: 'status',
      trueLabel: 'SERVICES.TABLE.ACTIVE',
      falseLabel: 'SERVICES.TABLE.INACTIVE',
      sortable: true,
    },
  ];

  readonly actions: TableAction<ServiceItem>[] = [
    {
      key: 'edit',
      label: 'SERVICES.TABLE.EDIT',
      icon: Pencil,
      tone: 'primary',
    },
    {
      key: 'delete',
      label: 'SERVICES.TABLE.DELETE',
      icon: Trash2,
      tone: 'danger',
    },
  ];

  onAction(e: TableActionEvent<ServiceItem>): void {
    if (e.key === 'edit') {
      this.editService(e.row);
    }

    if (e.key === 'delete') {
      this.askDelete(e.row);
    }
  }

  // ---------- Form State ----------
  isFormOpen = signal(false);
  selectedService = signal<ServiceItem | null>(null);
  isSubmitting = signal(false);
  isLoadingTranslations = signal(false);

  // ---------- Delete State ----------
  serviceToDelete = signal<ServiceItem | null>(null);
  isDeleting = signal(false);

  // ---------- Form ----------
  form = this.fb.nonNullable.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100)]],
    descriptionAr: [''],
    descriptionEn: [''],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.serviceCatalog.getServices().subscribe({
      error: () => {
        this.toastr.error(
          this.translate.instant('SERVICES.MESSAGES.LOAD_ERROR')
        );
      },
    });
  }

  // ---------- Display ----------
  displayName(s: ServiceItem): string {
    return s.name ?? s.nameAr ?? s.nameEn ?? '';
  }

  isFieldInvalid(name: 'nameAr' | 'nameEn' | 'price'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  // ---------- Add ----------
  openAddForm(): void {
    this.selectedService.set(null);

    this.form.reset({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      price: null,
      isActive: true,
    });

    this.isFormOpen.set(true);
  }

  // ---------- Edit ----------
  editService(s: ServiceItem): void {
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

          this.toastr.error(
            this.translate.instant('SERVICES.MESSAGES.TRANSLATIONS_ERROR')
          );
        },
      });
    }
  }

  // ---------- Reset ----------
  resetForm(): void {
    this.isFormOpen.set(false);
    this.selectedService.set(null);
  }

  // ---------- Create / Update ----------
  onSubmit(): void {
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
      ? this.serviceCatalog.updateService(editing.id, {
          id: editing.id,
          ...base,
        })
      : this.serviceCatalog.createService(base);

    this.isSubmitting.set(true);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);

        this.toastr.success(
          this.translate.instant(
            editing
              ? 'SERVICES.MESSAGES.UPDATE_SUCCESS'
              : 'SERVICES.MESSAGES.CREATE_SUCCESS'
          )
        );

        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting.set(false);

        this.toastr.error(
          err?.error?.message ||
            this.translate.instant('SERVICES.MESSAGES.SAVE_ERROR')
        );
      },
    });
  }

  // ---------- Delete ----------
  askDelete(s: ServiceItem): void {
    this.serviceToDelete.set(s);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;

    this.serviceToDelete.set(null);
  }

  confirmDelete(): void {
    const s = this.serviceToDelete();
    if (!s) return;

    this.isDeleting.set(true);

    this.serviceCatalog.deleteService(s.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.serviceToDelete.set(null);

        this.toastr.success(
          this.translate.instant('SERVICES.MESSAGES.DELETE_SUCCESS')
        );
      },
      error: (err) => {
        this.isDeleting.set(false);

        this.toastr.error(
          err?.error?.message ||
            this.translate.instant('SERVICES.MESSAGES.DELETE_ERROR')
        );
      },
    });
  }
}