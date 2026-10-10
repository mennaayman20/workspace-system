import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastrService } from 'ngx-toastr';
import { CompanyService } from '../company.service';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../Icompany';
import {
  LucideAngularModule, X, Building2, Save, Phone, Mail, UserRound,
  Wallet, FileText, ScrollText, Hash, Languages,
} from 'lucide-angular';

@Component({
  selector: 'app-add-company-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, LucideAngularModule,
    InputTextModule, TextareaModule, InputNumberModule, SelectModule,
  ],
  templateUrl: './add-company-modal.component.html',
})
export class AddCompanyModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private toastr = inject(ToastrService);

  companyToEdit = input<Company | null>(null);
  closeModal = output<void>();
  companySaved = output<any | void>();

  isSubmitting = signal<boolean>(false);
  isLoadingTranslations = signal<boolean>(false);
  errorMessage = signal<string>('');

  readonly CloseIcon = X;
  readonly BuildingIcon = Building2;
  readonly SaveIcon = Save;
  readonly PhoneIcon = Phone;
  readonly MailIcon = Mail;
  readonly UserIcon = UserRound;
  readonly WalletIcon = Wallet;
  readonly TaxIcon = FileText;
  readonly ContractIcon = ScrollText;
  readonly HashIcon = Hash;
  readonly LangIcon = Languages;

  companyForm!: FormGroup;

  ngOnInit() {
    this.initForm();

    const editData = this.companyToEdit();
    if (editData) {
      // بيانات فورية من الـ List
      this.companyForm.patchValue({
        nameAr: editData.nameAr ?? '',
        nameEn: editData.nameEn ?? '',
        contactPerson: editData.contactPerson ?? '',
        phone: editData.phone ?? '',
        email: editData.email ?? '',
        taxNumber: editData.taxNumber ?? '',
        taxInformationAr: editData.taxInformationAr ?? '',
        taxInformationEn: editData.taxInformationEn ?? '',
        contractDetailsAr: editData.contractDetailsAr ?? '',
        contractDetailsEn: editData.contractDetailsEn ?? '',
        pricingPlanId: editData.pricingPlanId ?? null,
        creditLimit: editData.creditLimit ?? 0,
      });

      // القيم باللغتين
      this.isLoadingTranslations.set(true);
      this.companyService.getTranslations(editData.id).subscribe({
        next: (t) => {
          this.companyForm.patchValue(t);
          this.isLoadingTranslations.set(false);
        },
        error: () => this.isLoadingTranslations.set(false),
      });
    }
  }

  private initForm() {
    this.companyForm = this.fb.group({
      nameAr: ['', [Validators.required, Validators.minLength(2)]],
      nameEn: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: [''],
      phone: ['', [Validators.pattern('^[0-9+ ]*$')]],
      email: ['', [Validators.email]],
      taxNumber: [''],
      taxInformationAr: [''],
      taxInformationEn: [''],
      contractDetailsAr: [''],
      contractDetailsEn: [''],
      pricingPlanId: [null],
      creditLimit: [0, [Validators.required, Validators.min(0)]],
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.companyForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  private buildDto(): CreateCompanyDto {
    const v = this.companyForm.getRawValue();
    const t = (s: string | null) => (s ?? '').trim() || null;
    return {
      nameAr: (v.nameAr ?? '').trim(),
      nameEn: (v.nameEn ?? '').trim(),
      contactPerson: t(v.contactPerson),
      phone: t(v.phone),
      email: t(v.email),
      taxNumber: t(v.taxNumber),
      taxInformationAr: t(v.taxInformationAr),
      taxInformationEn: t(v.taxInformationEn),
      contractDetailsAr: t(v.contractDetailsAr),
      contractDetailsEn: t(v.contractDetailsEn),
      pricingPlanId: v.pricingPlanId ?? null,
      creditLimit: Number(v.creditLimit ?? 0),
    };
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.error?.title === 'string') return err.error.title;
    return fallback;
  }

  onSubmit() {
    if (this.companyForm.invalid || this.isLoadingTranslations()) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const dto = this.buildDto();
    const editData = this.companyToEdit();

    if (editData) {
      const updateDto: UpdateCompanyDto = { id: editData.id, ...dto };
      this.companyService.updateCompany(editData.id, updateDto).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastr.success('تم تعديل بيانات الشركة بنجاح');
          this.companySaved.emit(updateDto);
        },
        error: (err) => {
          const msg = this.extractError(err, 'حدث خطأ أثناء تعديل بيانات الشركة.');
          this.errorMessage.set(msg);
          this.toastr.error(msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.companyService.createCompany(dto).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.toastr.success('تمت إضافة الشركة بنجاح');
          this.companySaved.emit(res);
        },
        error: (err) => {
          const msg = this.extractError(err, 'حدث خطأ أثناء إضافة الشركة الجديدة.');
          this.errorMessage.set(msg);
          this.toastr.error(msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onClose() {
    this.closeModal.emit();
  }
}