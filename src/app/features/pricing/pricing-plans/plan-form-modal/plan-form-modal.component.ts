import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Observable, map } from 'rxjs';
import { LucideAngularModule, Layers, X, Save, FileText } from 'lucide-angular';

import { PricingPlanService } from '../../../pricing/pricing-plan.service';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { PricingPlan, PricingPlanPayload } from '../../Ipricing';

export interface PlanFormResult {
  id: number;
  isNew: boolean;
}

@Component({
  selector: 'app-plan-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, InputTextModule, TextareaModule, ToggleSwitchModule],
  templateUrl: './plan-form-modal.component.html',
})
export class PlanFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly planService = inject(PricingPlanService);
  private readonly toastr = inject(ToastrService);

  plan = input<PricingPlan | null>(null);
  saved = output<PlanFormResult>();
  closeModal = output<void>();

  readonly LayersIcon = Layers;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly TextIcon = FileText;

  readonly isSaving = signal(false);
  readonly isLoadingTranslations = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    nameEn: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]],
    descriptionAr: ['', [Validators.maxLength(500)]],
    descriptionEn: ['', [Validators.maxLength(500)]],
    isActive: [true],
  });

  get isEdit(): boolean {
    return !!this.plan();
  }

  ngOnInit(): void {
    const p = this.plan();
    if (!p) return;

    // بيانات فورية من الـ List
    this.form.patchValue({
      nameAr: p.nameAr ?? '',
      nameEn: p.nameEn ?? '',
      descriptionAr: p.descriptionAr ?? '',
      descriptionEn: p.descriptionEn ?? '',
      isActive: p.isActive,
    });

    // القيم باللغتين
    this.isLoadingTranslations.set(true);
    this.planService.getTranslations(p.id).subscribe({
      next: (t) => {
        this.form.patchValue(t);
        this.isLoadingTranslations.set(false);
      },
      error: () => this.isLoadingTranslations.set(false),
    });
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  submit(): void {
    if (this.isSaving() || this.isLoadingTranslations()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: PricingPlanPayload = {
      nameAr: v.nameAr.trim(),
      nameEn: v.nameEn.trim(),
      descriptionAr: v.descriptionAr.trim() || null,
      descriptionEn: v.descriptionEn.trim() || null,
      isActive: v.isActive,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.save(payload).subscribe({
      next: (result) => {
        this.isSaving.set(false);
        this.saved.emit(result);
      },
      error: (err) => {
        const msg = apiErrorMessage(err, 'تعذر حفظ الخطة، حاول مرة أخرى');
        this.isSaving.set(false);
        this.errorMessage.set(msg);
        this.toastr.error(msg);
      },
    });
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.closeModal.emit();
  }

  private save(payload: PricingPlanPayload): Observable<PlanFormResult> {
    const p = this.plan();
    return p
      ? this.planService.update(p.id, payload).pipe(map(() => ({ id: p.id, isNew: false })))
      : this.planService.create(payload).pipe(map((id) => ({ id, isNew: true })));
  }
}