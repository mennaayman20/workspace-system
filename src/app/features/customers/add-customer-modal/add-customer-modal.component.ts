import { Component, OnInit, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CustomerService } from '../customer.service';
import { CompanyService } from '../../company/company.service';
import { Customer, CustomerType } from '../Icustomer';
import { Company } from '../../company/Icompany';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف
import {
  LucideAngularModule, X, User, Save, Plus, Phone, Mail, Building2, BadgeCheck, DoorOpen,
} from 'lucide-angular';
import { AddCompanyModalComponent } from '../../company/add-company-modal/add-company-modal.component';

@Component({
  selector: 'app-add-customer-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, LucideAngularModule,
    AddCompanyModalComponent, SelectModule, InputTextModule,
    TranslatePipe,
  ],
  templateUrl: './add-customer-modal.component.html',
})
export class AddCustomerModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);

  customerToEdit = input<Customer | null>(null);
  closeModal = output<void>();
  customerCreated = output<void>();

  isSubmitting = signal<boolean>(false);
  isLoadingNames = signal<boolean>(false);
  errorMessage = signal<string>('');
  companies = signal<Company[]>([]);
  showCompanyModal = signal<boolean>(false);

  readonly CloseIcon = X;
  readonly UserIcon = User;
  readonly SaveIcon = Save;
  readonly PlusIcon = Plus;
  readonly PhoneIcon = Phone;
  readonly MailIcon = Mail;
  readonly BuildingIcon = Building2;

  readonly typeOptions = computed<{
    value: CustomerType; label: string; hint: string; icon: any; tone: string;
  }[]>(() => {
    const t = (k: string) => this.lang.t(k);
    return [
      { value: 'Individual', label: t('CUSTOMERS.TYPES.INDIVIDUAL'), hint: t('CUSTOMERS.TYPE_HINTS.INDIVIDUAL'), icon: User,       tone: 'bg-blue-100 text-blue-600' },
      { value: 'Corporate',  label: t('CUSTOMERS.TYPES.CORPORATE'),  hint: t('CUSTOMERS.TYPE_HINTS.CORPORATE'),  icon: Building2,  tone: 'bg-purple-100 text-purple-600' },
      { value: 'Member',     label: t('CUSTOMERS.TYPES.MEMBER'),     hint: t('CUSTOMERS.TYPE_HINTS.MEMBER'),     icon: BadgeCheck, tone: 'bg-emerald-100 text-emerald-600' },
      { value: 'WalkIn',     label: t('CUSTOMERS.TYPES.WALKIN'),     hint: t('CUSTOMERS.TYPE_HINTS.WALKIN'),     icon: DoorOpen,   tone: 'bg-orange-100 text-orange-600' },
    ];
  });

  customerForm!: FormGroup;

  ngOnInit() {
    this.initForm();

    // الاشتراك لازم يكون قبل الـ patchValue
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

    this.loadCompanies();

    const editData = this.customerToEdit();
    if (editData) {
      this.customerForm.patchValue({
        fullNameAr: editData.fullNameAr ?? '',
        fullNameEn: editData.fullNameEn ?? '',
        mobileNumber: editData.mobileNumber,
        email: editData.email ?? '',
        customerType: editData.customerType,
        companyId: editData.companyId ?? null,
      });

      this.isLoadingNames.set(true);
      this.customerService.getCustomerNames(editData.id).subscribe({
        next: (names) => {
          this.customerForm.patchValue(names);
          this.isLoadingNames.set(false);
        },
        error: () => this.isLoadingNames.set(false),
      });
    }
  }

  private initForm() {
    this.customerForm = this.fb.group({
      fullNameAr: ['', [Validators.required]],
      fullNameEn: ['', [Validators.required]],
      mobileNumber: ['', [Validators.required]],
      email: ['', [Validators.email]],
      customerType: ['Individual', [Validators.required]],
      companyId: [null],
    });
  }

  isInvalid(name: string): boolean {
    const c = this.customerForm.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  loadCompanies(selectCreatedCompanyId?: number | string) {
    this.companyService.getCompanies(1, 100).subscribe({
      next: (res: any) => {
        let list: Company[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.items) list = res.items;
        else if (res?.data) list = Array.isArray(res.data) ? res.data : res.data.items || [];

        this.companies.set(list);

        if (selectCreatedCompanyId) {
          this.customerForm.patchValue({ companyId: Number(selectCreatedCompanyId) });
        }
      },
      error: (err) => {
        const apiError = err?.error?.message || err?.error;
        this.errorMessage.set(
          typeof apiError === 'string' ? apiError : this.lang.t('CUSTOMERS.MODAL.ERR_COMPANIES')
        );
      },
    });
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.error?.title === 'string') return err.error.title;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }

  onSubmit() {
    if (this.customerForm.invalid || this.isLoadingNames()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const v = this.customerForm.value;
    const editData = this.customerToEdit();

    const dto = {
      fullNameAr: (v.fullNameAr ?? '').trim(),
      fullNameEn: (v.fullNameEn ?? '').trim(),
      mobileNumber: (v.mobileNumber ?? '').trim(),
      email: v.email?.trim() || null,
      customerType: v.customerType as CustomerType,
      companyId: v.customerType === 'Corporate' && v.companyId != null ? Number(v.companyId) : null,
      notes: editData?.notes ?? null,
    };

    if (editData) {
      this.customerService.updateCustomer(editData.id, { id: editData.id, ...dto }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastr.success(this.lang.t('CUSTOMERS.MODAL.EDITED'));
          this.customerCreated.emit();
        },
        error: (err) => {
          const msg = this.extractError(err, this.lang.t('CUSTOMERS.MODAL.ERR_EDIT'));
          this.errorMessage.set(msg);
          this.toastr.error(msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.customerService.createCustomer(dto).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastr.success(this.lang.t('CUSTOMERS.MODAL.ADDED'));
          this.customerCreated.emit();
        },
        error: (err) => {
          const msg = this.extractError(err, this.lang.t('CUSTOMERS.MODAL.ERR_ADD'));
          this.errorMessage.set(msg);
          this.toastr.error(msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  // مودال الشركة بيطلّع توستر النجاح بنفسه
  onCompanyCreated(res?: any) {
    this.showCompanyModal.set(false);
    const newId = res?.id || res?.data?.id || res?.data || res;
    this.loadCompanies(newId);
  }

  onClose() {
    this.closeModal.emit();
  }
}