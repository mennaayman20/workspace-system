import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

import { PricingPlanService } from '../../pricing-plan.service';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { PricingPlan, PricingPlanPayload } from '../../Ipricing';

export interface PlanFormDialogData {
  plan?: PricingPlan;
}

export interface PlanFormResult {
  id: number;
  isNew: boolean;
}

@Component({
  selector: 'app-plan-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './plan-form-dialog.component.html',
})
export class PlanFormDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly planService = inject(PricingPlanService);
  
  // ✅ التصحيح هنا: تمرير MatDialogRef بشكل صحيح للـ Injector
  private readonly dialogRef = inject(MatDialogRef<PlanFormDialogComponent, PlanFormResult>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<PlanFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly isEdit = !!this.data?.plan;
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    name: [
      this.data?.plan?.name ?? '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(/^(?!\s*$).+/)]
    ],
    description: [this.data?.plan?.description ?? '', [Validators.maxLength(500)]],
    isActive: [this.data?.plan?.isActive ?? true],
  });

  submit(): void {
    if (this.isSaving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, isActive } = this.form.getRawValue();
    const payload: PricingPlanPayload = {
      name: name.trim(),
      description: description.trim() || null,
      isActive,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.save(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.dialogRef.close(result),
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(apiErrorMessage(err, 'تعذر حفظ الخطة، حاول مرة أخرى'));
        },
      });
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.dialogRef.close();
  }

  private save(payload: PricingPlanPayload): Observable<PlanFormResult> {
    const plan = this.data?.plan;
    return plan
      ? this.planService.update(plan.id, payload).pipe(map(() => ({ id: plan.id, isNew: false })))
      : this.planService.create(payload).pipe(map((id) => ({ id, isNew: true })));
  }
}