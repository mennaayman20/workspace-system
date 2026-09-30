import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerService } from './customer.service';
import { Customer, CustomerType } from './Icustomer';
import { AddCustomerModalComponent } from './add-customer-modal/add-customer-modal.component';
import { LucideAngularModule, Plus, Users , BuildingIcon} from 'lucide-angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, AddCustomerModalComponent , LucideAngularModule ],
  templateUrl: './customers.component.html'
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
private router = inject(Router);

BuildingIcon = BuildingIcon;

  // State Management using Signals
  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  
  // Modal State
  isModalOpen = signal<boolean>(false);
  editingCustomer = signal<Customer | null>(null);
readonly UsersIcon = Users;
  readonly PlusIcon = Plus;
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
    error: (err) => {
      this.errorMessage.set('حدث خطأ أثناء تحميل بيانات العملاء.');
      this.isLoading.set(false);
    }
  });
}

goToCompanies(): void {
    this.router.navigate(['/company']); // تأكدي أن المسار في app.routes.ts مكتوب 'company'
  }

  // 2. البحث التفاعلي (Search)
  onSearch(term: string) {
    this.loadCustomers(term);
  }

  // 3. فتح مودال الإضافة
  openAddModal() {
    this.editingCustomer.set(null);
    this.isModalOpen.set(true);
  }

  // 4. فتح مودال التعديل
  openEditModal(customer: Customer) {
    this.editingCustomer.set(customer);
    this.isModalOpen.set(true);
  }

  // 5. إغلاق المودال
  closeModal() {
    this.isModalOpen.set(false);
    this.editingCustomer.set(null);
  }

  // 6. التحديث بعد الحفظ (سواء إضافة أو تعديل)
  refreshAfterSave() {
    this.closeModal();
    this.loadCustomers();
  }

  // 7. حذف عميل
  onDelete(id: number) {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا العميل؟')) {
      this.customerService.deleteCustomer(id).subscribe({
        next: () => {
          this.loadCustomers();
        },
        error: () => {
          alert('تعذر حذف العميل، قد يكون مرتبطاً ببيانات أخرى بالنظام.');
        }
      });
    }
  }

  // 8. تنسيق شارات (Badges) أنواع العملاء
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