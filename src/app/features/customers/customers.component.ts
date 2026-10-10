import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CustomerService } from './customer.service';
import { Customer, CustomerType, CUSTOMER_TYPE_LABELS } from './Icustomer';
import { AddCustomerModalComponent } from './add-customer-modal/add-customer-modal.component';
import { LucideAngularModule, Plus, Users, BuildingIcon, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, AddCustomerModalComponent, LucideAngularModule],
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

  // Modal State
  isModalOpen = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);

  // Delete confirmation
  pendingDelete = signal<Customer | null>(null);
  isDeleting = signal<boolean>(false);

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
    this.loadCustomers();
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
        this.loadCustomers();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toastr.error(
          err?.error?.message || 'تعذر حذف العميل، قد يكون مرتبطاً ببيانات أخرى بالنظام.'
        );
      }
    });
  }

  // ---------- العرض ----------
  typeLabel(t: CustomerType): string {
    return CUSTOMER_TYPE_LABELS[t]?.ar ?? t;
  }

  getCustomerTypeBadgeClass(type: CustomerType): string {
    switch (type) {
      case 'Corporate':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Member':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'WalkIn':
        return 'bg-orange-100 text-orange-700 border border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
  }
}