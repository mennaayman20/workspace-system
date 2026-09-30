import { Component, OnInit, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, UserPlus, Play, Search, Loader2 } from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { SessionsService } from '../sessions.service';
import { CustomerService } from '../../customers/customer.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { PricingPlanService } from '../../pricing/pricing-plan.service';

import { StartSessionCommand } from '../Isessions';
import { Customer, CreateCustomerDto } from '../../customers/Icustomer';
import { Workspace } from '../../../core/interfaces/Iworkspace';
import { PricingPlan } from '../../pricing/Ipricing';
import { EmployeeService } from '../../employee/employee.service';
import { Employee } from '../../employee/Iimployee';

@Component({
  selector: 'app-start-session-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './start-session-modal.component.html'
})
export class StartSessionModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private sessionsService = inject(SessionsService);
  private customerService = inject(CustomerService);
  private workspaceService = inject(WorkspaceService);
  private pricingPlanService = inject(PricingPlanService);
private employeeService = inject(EmployeeService);
  @Output() closeModal = new EventEmitter<void>();
  @Output() sessionStarted = new EventEmitter<void>();

  readonly XIcon = X;
  readonly UserPlusIcon = UserPlus;
  readonly PlayIcon = Play;
  readonly SearchIcon = Search;


  isLoading = signal<boolean>(false);
  isSearchingCustomers = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
employeesList = signal<Employee[]>([]);
  // قوائم البيانات الفعلية من الـ APIs
  customersList = signal<Customer[]>([]);
  workspacesList = signal<Workspace[]>([]);
  pricingPlansList = signal<PricingPlan[]>([]);

  // التحكم بفتح مودال العميل السريع
  isQuickAddCustomerOpen = signal<boolean>(false);

  // Subject للبحث الديناميكي عن العملاء عبر الـ API
  private searchSubject = new Subject<string>();

sessionForm: FormGroup = this.fb.group({
  customerId: [null, [Validators.required]],
  employeeId: [null, [Validators.required]], // <-- تأكد من إضافة هذا الحقل هنا
  bookingId: [null],
  workspaceId: [null, [Validators.required]],
  pricingPlanId: [null, [Validators.required]],
  numberOfPeople: [1, [Validators.required, Validators.min(1)]]
});
  quickCustomerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    mobileNumber: ['', [Validators.required]],
    email: [''],
    customerType: ['Individual', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadInitialData();
    this.setupCustomerSearch();
  }

private loadInitialData(): void {

  this.employeeService.getEmployees().subscribe({
    next: (res: any) => {
      const employees = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
      console.log('Employees loaded:', employees); // طباعة البيانات للتأكد
      this.employeesList.set(employees);
    },
    error: (err) => {
      console.error('Error loading employees:', err);
      this.employeesList.set([]);
    }
  });
  // 1. جلب العملاء بشكل آمن
  this.customerService.getCustomers(1, 10).subscribe({
    next: (res: any) => {
      const customers = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
      this.customersList.set(customers);
    },
    error: () => this.customersList.set([])
  });

  // 2. جلب أماكن العمل بشكل آمن
  this.workspaceService.getWorkspaces().subscribe({
    next: (res: any) => {
      const workspaces = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
      this.workspacesList.set(workspaces);
    },
    error: () => this.workspacesList.set([])
  });

  // 3. جلب خطط التسعير بشكل آمن
  this.pricingPlanService.getPlans().subscribe({
    next: (res: any) => {
      const plans = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
      this.pricingPlansList.set(plans);
    },
    error: () => this.pricingPlansList.set([])
  });
}

private setupCustomerSearch(): void {
  this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term: string) => {
      this.isSearchingCustomers.set(true);
      if (!term.trim()) {
        return this.customerService.getCustomers(1, 10);
      }
      return this.customerService.searchCustomers(term, 1, 10);
    })
  ).subscribe({
    next: (res: any) => {
      const customers = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
      this.customersList.set(customers);
      this.isSearchingCustomers.set(false);
    },
    error: () => {
      this.customersList.set([]);
      this.isSearchingCustomers.set(false);
    }
  });
}

  onSearchCustomer(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  toggleQuickAddCustomer(): void {
    this.isQuickAddCustomerOpen.update(v => !v);
  }

  // حفظ العميل الجديد سريعا واختياره تلقائيا
  saveQuickCustomer(): void {
    if (this.quickCustomerForm.invalid) {
      this.quickCustomerForm.markAllAsTouched();
      return;
    }

    const dto: CreateCustomerDto = this.quickCustomerForm.value;
    this.isLoading.set(true);

    this.customerService.createCustomer(dto).subscribe({
      next: (res) => {
        const newCustomerId = res.data;
        this.isLoading.set(false);
        this.isQuickAddCustomerOpen.set(false);

        // جلب بيانات العميل المضاف لتحديث القائمة واختياره فوراً
        this.customerService.getCustomerById(newCustomerId).subscribe(customer => {
          this.customersList.update(list => [customer, ...list]);
          this.sessionForm.patchValue({ customerId: customer.id });
        });

        this.quickCustomerForm.reset({ customerType: 'Individual' });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء إضافة العميل.');
      }
    });
  }

  // إرسال أمر بدء الجلسة StartSessionCommand
  onSubmit(): void {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

const command: StartSessionCommand = {
  customerId: Number(this.sessionForm.value.customerId),
  employeeId: Number(this.sessionForm.value.employeeId), // <-- أضيفي هذا السطر
  bookingId: this.sessionForm.value.bookingId ? Number(this.sessionForm.value.bookingId) : null,
  workspaceId: Number(this.sessionForm.value.workspaceId),
  pricingPlanId: Number(this.sessionForm.value.pricingPlanId),
  numberOfPeople: Number(this.sessionForm.value.numberOfPeople)
};

    this.sessionsService.startSession(command).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.sessionStarted.emit();
        this.closeModal.emit();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء بدء الجلسة.');
      }
    });
  }
}