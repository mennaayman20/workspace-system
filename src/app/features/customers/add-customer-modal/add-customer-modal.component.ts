import { Component, OnInit, Output, EventEmitter, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '../customer.service';
import { CompanyService } from '../../company/company.service';
import { Company } from '../../company/Icompany';
import { AddCompanyModalComponent } from '../../company/add-company-modal/add-company-modal.component';
import { Customer, CustomerType } from '../Icustomer';

@Component({
  selector: 'app-add-customer-modal',
  standalone: true,
  imports: [ReactiveFormsModule, AddCompanyModalComponent],
  templateUrl: './add-customer-modal.component.html'
})
export class AddCustomerModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);

  @Input() customerToEdit: Customer | null = null;
  @Output() customerCreated = new EventEmitter<number>();
  @Output() closeModal = new EventEmitter<void>();

  customerForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  companiesList: Company[] = [];
  showCompanyModal = false;

  readonly customerTypes: CustomerType[] = ['Individual', 'Corporate', 'Member', 'WalkIn'];

  ngOnInit() {
    this.initForm();
    this.listenToCustomerTypeChanges();
    this.populateFormIfEdit();
  }

  private initForm() {
    this.customerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(150)]],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      email: ['', [Validators.email]],
      customerType: ['Individual' as CustomerType, [Validators.required]],
      companyId: [null],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  // تعبئة البيانات في حالة التعديل
  private populateFormIfEdit() {
    if (this.customerToEdit) {
      this.customerForm.patchValue({
        fullName: this.customerToEdit.fullName,
        mobileNumber: this.customerToEdit.mobileNumber,
        email: this.customerToEdit.email,
        customerType: this.customerToEdit.customerType,
        companyId: this.customerToEdit.companyId,
        notes: this.customerToEdit.notes
      });

      // جلب الشركة لـ Dropdown إذا كان العميل مجدول كـ Corporate وله companyId
      if (this.customerToEdit.companyId) {
        this.companyService.getCompanyById(this.customerToEdit.companyId).subscribe({
          next: (company) => {
            this.companiesList = [company];
          }
        });
      }
    }
  }

  // التحكم الديناميكي بإلزام حقل الشركة وتفريغه
  private listenToCustomerTypeChanges() {
    this.customerForm.get('customerType')?.valueChanges.subscribe((type: CustomerType) => {
      const companyControl = this.customerForm.get('companyId');

      if (type === 'Corporate') {
        companyControl?.setValidators([Validators.required]);
      } else {
        companyControl?.clearValidators();
        companyControl?.setValue(null); // مسح companyId للأنواع غير الشركات
      }
      companyControl?.updateValueAndValidity();
    });
  }

  // البحث عن الشركة بمجرد كتابة الاسم
  onCompanySearch(term: string) {
    if (!term || term.trim().length === 0) return;

    this.companyService.searchCompanies(term).subscribe({
      next: (res) => this.companiesList = res,
      error: () => this.companiesList = []
    });
  }

  // معالجة عند إنشاء شركة جديدة من المودال المباشر
  onCompanyCreated(newCompany: { id: number; name: string }) {
    this.showCompanyModal = false;
    // إضافة الشركة للـ Dropdown وتحديدها فوراً
    this.companiesList = [{ id: newCompany.id, name: newCompany.name } as Company, ...this.companiesList];
    this.customerForm.patchValue({ companyId: newCompany.id });
  }

  onSubmit() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.customerToEdit) {
      // 1. حالة التعديل PUT
      this.customerService.updateCustomer(this.customerToEdit.id, this.customerForm.value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.customerCreated.emit(this.customerToEdit!.id);
        },
        error: (err) => this.handleError(err)
      });
    } else {
      // 2. حالة الإنشاء POST
      this.customerService.createCustomer(this.customerForm.value).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.customerCreated.emit(res.data); // إرجاع customerId الناتج مباشرة
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleError(err: any) {
    this.isSubmitting = false;
    if (err.status === 409) {
      this.errorMessage = 'رقم الموبايل مسجل لعميل آخر.';
    } else {
      this.errorMessage = 'يرجى مراجعة وتصحيح البيانات المدخلة.';
    }
  }
}