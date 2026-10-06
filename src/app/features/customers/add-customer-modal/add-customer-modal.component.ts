import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { CompanyService } from '../../company/company.service';
import { Customer, CustomerType } from '../Icustomer';
import { Company } from '../../company/Icompany';
import { LucideAngularModule, X, User, Save, ChevronDown, Plus } from 'lucide-angular';
import { AddCompanyModalComponent } from '../../company/add-company-modal/add-company-modal.component';

@Component({
  selector: 'app-add-customer-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, AddCompanyModalComponent],
  templateUrl: './add-customer-modal.component.html'
})
export class AddCustomerModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);

  customerToEdit = input<Customer | null>(null);
  closeModal = output<void>();
  customerCreated = output<void>();

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  companies = signal<Company[]>([]);
  showCompanyModal = signal<boolean>(false);

  readonly CloseIcon = X;
  readonly UserIcon = User;
  readonly SaveIcon = Save;
  readonly ChevronIcon = ChevronDown;
  readonly PlusIcon = Plus;

  customerForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadCompanies();

    const editData = this.customerToEdit();
    if (editData) {
      this.customerForm.patchValue({
        fullName: editData.fullName,
        mobileNumber: editData.mobileNumber,
        email: editData.email,
        customerType: editData.customerType,
        companyId: editData.companyId || null
      });
    }

    this.customerForm.get('customerType')?.valueChanges.subscribe((type: CustomerType) => {
      const companyIdControl = this.customerForm.get('companyId');
      if (type === 'Corporate') {
        companyIdControl?.setValidators([Validators.required]);
      } else {
        companyIdControl?.clearValidators();
        companyIdControl?.setValue(null);
      }
      companyIdControl?.updateValueAndValidity();
    });
  }

  private initForm() {
    this.customerForm = this.fb.group({
      fullName: ['', [Validators.required]],
      mobileNumber: ['', [Validators.required]],
      email: ['', [Validators.email]],
      customerType: ['WalkIn', [Validators.required]],
      companyId: [null]
    });
  }

loadCompanies(selectCreatedCompanyId?: number | string) {
  this.companyService.getCompanies(1, 100).subscribe({
    next: (res: any) => {
      let list: Company[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res?.items) {
        list = res.items;
      } else if (res?.data) {
        list = Array.isArray(res.data) ? res.data : res.data.items || [];
      }
      
      this.companies.set(list);

      if (selectCreatedCompanyId) {
        this.customerForm.patchValue({ companyId: selectCreatedCompanyId });
      }
    },
    error: (err) => {
      console.error('Error loading companies:', err);
      // استخراج الرسالة من الـ Response أو إرجاع النص الافتراضي
      const apiError = err?.error?.message || err?.error || 'حدث خطأ أثناء تحميل قائمة الشركات.';
      this.errorMessage.set(typeof apiError === 'string' ? apiError : 'حدث خطأ أثناء تحميل قائمة الشركات.');
    }
  });
}

onSubmit() {
  if (this.customerForm.invalid) {
    this.customerForm.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');

  const formValue = this.customerForm.value;
  const editData = this.customerToEdit();

  // دالة مساعدة صغيرة لاستخراج الرسالة من كائن الخطأ
  const extractErrorMessage = (err: any, fallbackText: string): string => {
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.message && typeof err.error.message === 'string') return err.error.message;
    if (err?.error?.title && typeof err.error.title === 'string') return err.error.title; // حالة ASP.NET Validation problem details
    if (err?.message && typeof err.message === 'string') return err.message;
    return fallbackText;
  };

  if (editData) {
    this.customerService.updateCustomer(editData.id, { id: editData.id, ...formValue }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('تم تعديل بيانات العميل بنجاح!');
        setTimeout(() => {
          this.customerCreated.emit();
        }, 1000);
      },
      error: (err) => {
        const msg = extractErrorMessage(err, 'حدث خطأ أثناء تعديل بيانات العميل.');
        this.errorMessage.set(msg);
        this.isSubmitting.set(false);
      }
    });
  } else {
    this.customerService.createCustomer(formValue).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('تم إضافة العميل بنجاح!');
        setTimeout(() => {
          this.customerCreated.emit();
        }, 1000);
      },
      error: (err) => {
        const msg = extractErrorMessage(err, 'حدث خطأ أثناء إضافة العميل.');
        this.errorMessage.set(msg);
        this.isSubmitting.set(false);
      }
    });
  }
}
  onCompanyCreated(res?: any) {
    this.showCompanyModal.set(false);
    const newId = res?.id || res?.data?.id || res;

    this.successMessage.set('تمت إضافة الشركة بنجاح واختيارها تلقائياً.');
    setTimeout(() => this.successMessage.set(''), 3000);

    this.loadCompanies(newId);
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.closeModal.emit();
  }
}