import { Component, signal, inject, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CompanyService } from './company.service';
import { Company } from './Icompany';
import { LanguageService } from '../../core/services/lang.service'; // عدّل المسار لو مختلف
import { AddCompanyModalComponent } from './add-company-modal/add-company-modal.component';
import { LucideAngularModule, Building2, Plus, Trash2, Pencil } from 'lucide-angular';
import { PortalDirective } from '../../shared/directives/portal.directive';
import { DataTableComponent, TableAction, TableActionEvent, TableColumn } from '../../shared/components/data-table';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [
    CommonModule, AddCompanyModalComponent, LucideAngularModule, PortalDirective, DataTableComponent,
    TranslatePipe,
  ],
  templateUrl: './company.component.html'
})
export class CompanyComponent {

  private companyService = inject(CompanyService);
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);

  private loadSub?: Subscription;

  // ---------- تعريف الجدول (computed عشان يتحدث مع اللغة) ----------
  readonly columns = computed<TableColumn<Company>[]>(() => {
    const t = (k: string) => this.lang.t(k);
    return [
      { key: 'name',          header: t('COMPANIES.COLUMNS.NAME'),         sortable: true, cellClass: 'font-bold text-blue' },
      { key: 'contactPerson', header: t('COMPANIES.COLUMNS.CONTACT') },
      { key: 'phone',         header: t('COMPANIES.COLUMNS.PHONE'),        type: 'mono' },
      { key: 'taxNumber',     header: t('COMPANIES.COLUMNS.TAX_NUMBER') },
      { key: 'creditLimit',   header: t('COMPANIES.COLUMNS.CREDIT_LIMIT'), type: 'currency', sortable: true },
      { key: 'isActive',      header: t('COMPANIES.COLUMNS.STATUS'),       type: 'status' },
    ];
  });

  readonly actions = computed<TableAction<Company>[]>(() => [
    { key: 'edit',   label: this.lang.t('COMPANIES.ACTIONS.EDIT'),   icon: Pencil, tone: 'primary' },
    { key: 'delete', label: this.lang.t('COMPANIES.ACTIONS.DELETE'), icon: Trash2, tone: 'danger' },
  ]);

  onAction(e: TableActionEvent<Company>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

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

  constructor() {
    // بيشتغل أول مرة، وبعدين كل ما اللغة تتغير: يعيد جلب الداتا بالـ header الجديد
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.loadCompanies());
    });
  }

  loadCompanies(searchTerm: string = '') {
    // بيلغي أي طلب قديم لسه شغال (لو المستخدم بدّل اللغة بسرعة)
    this.loadSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = searchTerm.trim()
      ? this.companyService.searchCompanies(searchTerm)
      : this.companyService.getCompanies();

    this.loadSub = request$.subscribe({
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
        this.errorMessage.set(this.lang.t('COMPANIES.LOAD_ERROR'));
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
        this.toastr.success(
          this.lang.t(newStatus ? 'COMPANIES.MSG.ACTIVATED' : 'COMPANIES.MSG.DEACTIVATED')
        );
        this.loadCompanies();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toastr.error(err?.error?.message || this.lang.t('COMPANIES.MSG.STATUS_ERROR'));
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
        this.toastr.success(this.lang.t('COMPANIES.DELETE.SUCCESS'));
        this.loadCompanies();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(err?.error?.message || this.lang.t('COMPANIES.DELETE.ERROR'));
      }
    });
  }
}