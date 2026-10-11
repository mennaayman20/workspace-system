import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { CompanyService } from './company.service';
import { Company } from './Icompany';
import { AddCompanyModalComponent } from './add-company-modal/add-company-modal.component';
import { LucideAngularModule, Building2, Plus, Trash2,Pencil } from 'lucide-angular';
import { PortalDirective } from '../../shared/directives/portal.directive';
import { DataTableComponent, TableAction, TableActionEvent, TableColumn } from '../../shared/components/data-table';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, AddCompanyModalComponent, LucideAngularModule , PortalDirective , DataTableComponent],
  templateUrl: './company.component.html'
})
export class CompanyComponent implements OnInit {

  readonly columns: TableColumn<Company>[] = [
  { key: 'name',          header: 'اسم الشركة',    sortable: true, cellClass: 'font-bold text-blue' },
  { key: 'contactPerson', header: 'الشخص المسؤول' },
  { key: 'phone',         header: 'رقم الهاتف',    type: 'mono' },
  { key: 'taxNumber',     header: 'الرقم الضريبي' },
  { key: 'creditLimit',   header: 'الحد الائتماني', type: 'currency', sortable: true },
  { key: 'isActive',      header: 'الحالة',        type: 'status' },
];

readonly actions: TableAction<Company>[] = [
  { key: 'edit',   label: 'تعديل', icon: Pencil, tone: 'primary' },
  { key: 'delete', label: 'حذف',   icon: Trash2, tone: 'danger' },
];

onAction(e: TableActionEvent<Company>): void {
  if (e.key === 'edit') this.openEditModal(e.row);
  if (e.key === 'delete') this.askDelete(e.row);
}



  private companyService = inject(CompanyService);
  private toastr = inject(ToastrService);

  companies = signal<Company[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Modal State
  isModalOpen = signal<boolean>(false);
  editingCompany = signal<Company | null>(null);

  // Delete confirmation
  pendingDelete = signal<Company | null>(null);
  isDeleting = signal<boolean>(false);
  busyId = signal<number | null>(null);

  readonly BuildingIcon = Building2;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies(searchTerm: string = '') {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = searchTerm.trim()
      ? this.companyService.searchCompanies(searchTerm)
      : this.companyService.getCompanies();

    request$.subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.companies.set(res);
        } else if (res && Array.isArray(res.items)) {
          this.companies.set(res.items);
        } else if (res?.data && Array.isArray(res.data.items)) {
          this.companies.set(res.data.items);
        } else if (res && Array.isArray(res.data)) {
          this.companies.set(res.data);
        } else {
          this.companies.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('حدث خطأ أثناء تحميل بيانات الشركات.');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string) {
    this.loadCompanies(term);
  }

  openAddModal() {
    this.editingCompany.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(company: Company) {
    this.editingCompany.set(company);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingCompany.set(null);
  }

  refreshAfterSave() {
    this.closeModal();
    this.loadCompanies();
  }

  onToggleStatus(company: Company) {
    const newStatus = !company.isActive;
    this.busyId.set(company.id);

    this.companyService.changeStatus({ id: company.id, isActive: newStatus }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toastr.success(newStatus ? 'تم تفعيل الشركة' : 'تم إيقاف الشركة');
        this.loadCompanies();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || 'تعذر تغيير حالة الشركة');
      }
    });
  }

  // ---------- الحذف ----------
  askDelete(company: Company) {
    this.pendingDelete.set(company);
  }

  cancelDelete() {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const c = this.pendingDelete();
    if (!c) return;

    this.isDeleting.set(true);
    this.companyService.deleteCompany(c.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        this.toastr.success('تم حذف الشركة بنجاح');
        this.loadCompanies();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(
          err?.error?.message || 'تعذر حذف الشركة، قد تكون مرتبطة ببيانات أخرى في النظام.'
        );
      }
    });
  }
}