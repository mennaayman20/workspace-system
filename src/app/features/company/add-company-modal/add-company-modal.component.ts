import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../company.service';
import { CreateCompanyDto } from '../Icompany';

@Component({
  selector: 'app-add-company-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-company-modal.component.html'
})
export class AddCompanyModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);

  @Output() companyCreated = new EventEmitter<{ id: number; name: string }>(); 
  @Output() closeModal = new EventEmitter<void>();

  companyForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  ngOnInit() {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      contactPerson: ['', [Validators.required, Validators.maxLength(150)]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      taxNumber: ['', [Validators.maxLength(50)]],
      taxInformation: ['', [Validators.maxLength(500)]],
      contractDetails: ['', [Validators.maxLength(1000)]],
      pricingPlanId: [null],
      creditLimit: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateCompanyDto = this.companyForm.value;

    this.companyService.createCompany(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.companyCreated.emit({ id: res.data, name: payload.name });
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 409) {
          this.errorMessage = 'توجد شركة أخرى بنفس الاسم مسجلة بالنظام.';
        } else {
          this.errorMessage = 'حدث خطأ في النظام، يرجى مراجعة البيانات والتحقق من الحقول.';
        }
      }
    });
  }
}