import { Component, signal, inject, computed, effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CustomerService } from './customer.service';
import { Customer } from './Icustomer';
import { LanguageService } from '../../core/services/lang.service'; // عدّل المسار لو مختلف
import { AddCustomerModalComponent } from './add-customer-modal/add-customer-modal.component';
import { LucideAngularModule, Plus, Users, BuildingIcon, Trash2, Pencil } from 'lucide-angular';
import { PortalDirective } from '../../shared/directives/portal.directive';
import {
  BADGE, DataTableComponent, TableAction, TableActionEvent, TableColumn,
} from '../../shared/components/data-table';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    AddCustomerModalComponent, LucideAngularModule, PortalDirective, DataTableComponent,
    TranslatePipe,
  ],
  templateUrl: './customers.component.html'
})
export class CustomersComponent {
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);

  private loadSub?: Subscription;

  BuildingIcon = BuildingIcon;
  readonly UsersIcon = Users;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  searchTerm = signal<string>('');

  // Modal State
  isModalOpen = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);

  // Delete confirmation
  pendingDelete = signal<Customer | null>(null);
  isDeleting = signal<boolean>(false);

  constructor() {
    // بيشتغل أول مرة، وبعدين كل ما اللغة تتغير: يعيد جلب الداتا بالـ header الجديد
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.loadCustomers(this.searchTerm()));
    });
  }

  // ---------- تعريف الجدول (computed عشان يتحدث مع اللغة) ----------
  readonly columns = computed<TableColumn<Customer>[]>(() => {
    const t = (k: string) => this.lang.t(k);
    return [
      { key: 'fullName', header: t('CUSTOMERS.COLUMNS.NAME'), sortable: true, cellClass: 'font-bold text-slate-900' },
      { key: 'mobileNumber', header: t('CUSTOMERS.COLUMNS.MOBILE'), type: 'mono' },
      {
        key: 'customerType', header: t('CUSTOMERS.COLUMNS.TYPE'), type: 'badge', sortable: true,
        badges: {
          Individual: { label: t('CUSTOMERS.TYPES.INDIVIDUAL'), class: BADGE.blue },
          Corporate:  { label: t('CUSTOMERS.TYPES.CORPORATE'),  class: BADGE.purple },
          Member:     { label: t('CUSTOMERS.TYPES.MEMBER'),     class: BADGE.green },
          WalkIn:     { label: t('CUSTOMERS.TYPES.WALKIN'),     class: BADGE.orange },
        },
      },
      { key: 'companyName', header: t('CUSTOMERS.COLUMNS.COMPANY') },
      { key: 'email', header: t('CUSTOMERS.COLUMNS.EMAIL'), type: 'mono', cellClass: 'text-xs text-slate-500' },
    ];
  });

  readonly actions = computed<TableAction<Customer>[]>(() => [
    { key: 'edit',   label: this.lang.t('CUSTOMERS.ACTIONS.EDIT'),   icon: Pencil, tone: 'primary' },
    { key: 'delete', label: this.lang.t('CUSTOMERS.ACTIONS.DELETE'), icon: Trash2, tone: 'danger' },
  ]);

  onAction(e: TableActionEvent<Customer>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

  loadCustomers(searchTerm: string = '') {
    // بيلغي أي طلب قديم لسه شغال (لو المستخدم بدّل اللغة أو كتب بسرعة)
    this.loadSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = searchTerm.trim()
      ? this.customerService.searchCustomers(searchTerm)
      : this.customerService.getCustomers();

    this.loadSub = request$.subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.customers.set(res);
        } else if (res && Array.isArray(res.items)) {
          this.customers.set(res.items);
        } else if (res?.data && Array.isArray(res.data.items)) {
          this.customers.set(res.data.items);
        } else if (res && Array.isArray(res.data)) {
          this.customers.set(res.data);
        } else {
          this.customers.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.lang.t('CUSTOMERS.LOAD_ERROR'));
        this.isLoading.set(false);
      }
    });
  }

  goToCompanies(): void {
    this.router.navigate(['/company']);
  }

  onSearch(term: string) {
    this.searchTerm.set(term.trim());
    this.loadCustomers(term);
  }

  openAddModal() {
    this.editingCustomer.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(customer: Customer) {
    this.editingCustomer.set(customer);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingCustomer.set(null);
  }

  refreshAfterSave() {
    this.closeModal();
    this.loadCustomers(this.searchTerm());
  }

  // ---------- الحذف ----------
  askDelete(customer: Customer) {
    this.pendingDelete.set(customer);
  }

  cancelDelete() {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const c = this.pendingDelete();
    if (!c) return;

    this.isDeleting.set(true);
    this.customerService.deleteCustomer(c.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDelete.set(null);
        this.toastr.success(this.lang.t('CUSTOMERS.DELETE.SUCCESS'));
        this.loadCustomers(this.searchTerm());
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(err?.error?.message || this.lang.t('CUSTOMERS.DELETE.ERROR'));
      }
    });
  }
}