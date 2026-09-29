import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../company.service';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../Icompany';
import { LucideAngularModule, X, Building2, Save } from 'lucide-angular';

@Component({
  selector: 'app-add-company-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './add-company-modal.component.html'
})
export class AddCompanyModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);

  companyToEdit = input<Company | null>(null);
  closeModal = output<void>();
  companySaved = output<any | void>(); // تقبل أي قيمة أو void لتجنب خطأ الـ TypeScript

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  readonly CloseIcon = X;
  readonly BuildingIcon = Building2;
  readonly SaveIcon = Save;

  companyForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    
    const editData = this.companyToEdit();
    if (editData) {
      this.companyForm.patchValue({
        name: editData.name,
        contactPerson: editData.contactPerson || '',
        phone: editData.phone || '',
        email: editData.email || '',
        taxNumber: editData.taxNumber || '',
        taxInformation: editData.taxInformation || '',
        contractDetails: editData.contractDetails || '',
        pricingPlanId: editData.pricingPlanId || null,
        creditLimit: editData.creditLimit || null
      });
    }
  }

  private initForm() {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: [''],
      phone: ['', [Validators.pattern('^[0-9+ ]*$')]],
      email: ['', [Validators.email]],
      taxNumber: [''],
      taxInformation: [''],
      contractDetails: [''],
      pricingPlanId: [null],
      creditLimit: [null, [Validators.min(0)]]
    });
  }

  // دالة مساعدة لفحص صحة الحقول في الـ HTML
  isFieldInvalid(fieldName: string): boolean {
    const field = this.companyForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  onSubmit() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValue = this.companyForm.value;
    const editData = this.companyToEdit();

    if (editData) {
      const updateDto: UpdateCompanyDto = {
        id: editData.id,
        ...formValue
      };

      this.companyService.updateCompany(editData.id, updateDto).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.companySaved.emit(updateDto);
        },
        error: () => {
          this.errorMessage.set('حدث خطأ أثناء تعديل بيانات الشركة.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      const createDto: CreateCompanyDto = {
        ...formValue
      };

      this.companyService.createCompany(createDto).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.companySaved.emit(res);
        },
        error: () => {
          this.errorMessage.set('حدث خطأ أثناء إضافة الشركة الجديدة.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onClose() {
    this.closeModal.emit();
  }
}