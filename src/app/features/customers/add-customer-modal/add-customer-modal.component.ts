import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { CompanyService } from '../../company/company.service';
import { Customer, CustomerType } from '../Icustomer';
import { Company } from '../../company/Icompany';
import { LucideAngularModule, X, User, Save } from 'lucide-angular';
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
  successMessage = signal<string>(''); // signal لرسائل النجاح
  companies = signal<Company[]>([]);
  showCompanyModal = signal<boolean>(false);

  readonly CloseIcon = X;
  readonly UserIcon = User;
  readonly SaveIcon = Save;

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
  // استخدام pageSize مقبولة من السيرفر (مثلاً 100 أو 50)
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
      this.errorMessage.set('حدث خطأ أثناء تحميل قائمة الشركات.');
    }
  });
}
onCompanyCreated(res?: any) {
  this.showCompanyModal.set(false);

  // استخراج ID الشركة الجديدة إن وجد في استجابة الـ API
  const newId = res?.id || res?.data?.id || res;

  this.successMessage.set('تمت إضافة الشركة بنجاح واختيارها تلقائياً.');
  setTimeout(() => this.successMessage.set(''), 3000);

  // إعادة تحميل قائمة الشركات واختيار الشركة الجديدة مباشرة
  this.loadCompanies(newId);
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

    if (editData) {
      this.customerService.updateCustomer(editData.id, { id: editData.id, ...formValue }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('تم تعديل بيانات العميل بنجاح!');
          setTimeout(() => {
            this.customerCreated.emit();
          }, 1000);
        },
        error: () => {
          this.errorMessage.set('حدث خطأ أثناء تعديل بيانات العميل.');
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
        error: () => {
          this.errorMessage.set('حدث خطأ أثناء إضافة العميل.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onClose() {
    this.closeModal.emit();
  }
}