import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from './customer.service';
import { Customer, CUSTOMER_TYPE_LABELS } from './Icustomer';
import { AddCustomerModalComponent } from './add-customer-modal/add-customer-modal.component';
import { LucideAngularModule, Plus, Users, BuildingIcon, Trash2, Pencil } from 'lucide-angular';
import { PortalDirective } from '../../shared/directives/portal.directive';
import {
  BADGE, DataTableComponent, TableAction, TableActionEvent, TableColumn,
} from '../../shared/components/data-table';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [AddCustomerModalComponent, LucideAngularModule, PortalDirective, DataTableComponent],
  templateUrl: './customers.component.html'
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

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

  // ---------- تعريف الجدول ----------
  readonly columns: TableColumn<Customer>[] = [
    { key: 'fullName', header: 'الاسم', sortable: true, cellClass: 'font-bold text-slate-900' },
    { key: 'mobileNumber', header: 'رقم الموبايل', type: 'mono' },
    {
      key: 'customerType', header: 'النوع', type: 'badge', sortable: true,
      badges: {
        Individual: { label: CUSTOMER_TYPE_LABELS.Individual.ar, class: BADGE.blue },
        Corporate:  { label: CUSTOMER_TYPE_LABELS.Corporate.ar,  class: BADGE.purple },
        Member:     { label: CUSTOMER_TYPE_LABELS.Member.ar,     class: BADGE.green },
        WalkIn:     { label: CUSTOMER_TYPE_LABELS.WalkIn.ar,     class: BADGE.orange },
      },
    },
    { key: 'companyName', header: 'الشركة التابع لها' },
    { key: 'email', header: 'الإيميل', type: 'mono', cellClass: 'text-xs text-slate-500' },
  ];

  readonly actions: TableAction<Customer>[] = [
    { key: 'edit',   label: 'تعديل', icon: Pencil, tone: 'primary' },
    { key: 'delete', label: 'حذف',   icon: Trash2, tone: 'danger' },
  ];

  onAction(e: TableActionEvent<Customer>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers(searchTerm: string = '') {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = searchTerm.trim()
      ? this.customerService.searchCustomers(searchTerm)
      : this.customerService.getCustomers();

    request$.subscribe({
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
        this.errorMessage.set('حدث خطأ أثناء تحميل بيانات العملاء.');
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
        this.toastr.success('تم حذف العميل بنجاح');
        this.loadCustomers(this.searchTerm());
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(
          err?.error?.message || 'تعذر حذف العميل، قد يكون مرتبطاً ببيانات أخرى بالنظام.'
        );
      }
    });
  }
}