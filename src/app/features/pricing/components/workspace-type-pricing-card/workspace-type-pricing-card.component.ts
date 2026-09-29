import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

import { PricingRuleService } from '../../pricing-rule.service';
import { NotifyService } from '../../notify.service';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { WorkspaceType } from '../../../../core/interfaces/Iworkspace';
import { configToOperations, isReadyForCheckout, rulesToConfig } from '../../pricing-rules.mapper';
import { PricingRule, TypePricingConfig } from '../../Ipricing';
import { TypePricingFormComponent } from '../type-pricing-form/type-pricing-form.component';

/** Card لنوع مساحة واحد داخل الخطة: بيعرض الحالة وبيحفظ التسعير. */
@Component({
  selector: 'app-workspace-type-pricing-card',
  standalone: true,
  imports: [TypePricingFormComponent, MatIconModule],
  templateUrl: './workspace-type-pricing-card.component.html',
})
export class WorkspaceTypePricingCardComponent {
  private readonly ruleService = inject(PricingRuleService);
  private readonly notify = inject(NotifyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly planId = input.required<number>();
  readonly workspaceType = input.required<WorkspaceType>();
  readonly rules = input.required<PricingRule[]>();
  /** بيتنادى بعد أي محاولة حفظ عشان الصفحة تعمل refresh للقواعد. */
  readonly changed = output<void>();

  readonly isSaving = signal(false);
  private readonly manualToggle = signal<boolean | null>(null);

  readonly config = computed(() => rulesToConfig(this.rules()));
  readonly isReady = computed(() => isReadyForCheckout(this.config()));
  /** مفتوح تلقائيًا لو النوع لسه ملوش سعر، إلا لو المستخدم غيّر بنفسه */
  readonly isOpen = computed(() => this.manualToggle() ?? !this.isReady());
  readonly summary = computed(() => {
    const rate = this.config().hourlyRate;
    return rate ? `${rate} ج / ساعة` : 'لم يتم تحديد السعر بعد';
  });

  toggle(): void {
    this.manualToggle.set(!this.isOpen());
  }

onSave(config: TypePricingConfig): void {
    const operations = configToOperations(this.planId(), this.workspaceType().id, this.rules(), config);
    if (operations.length === 0) return;

    this.isSaving.set(true);
    this.ruleService
      .applyOperations(operations) // إزالة التهميش من السطر هنا
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notify.show('تم حفظ التسعير بنجاح');
          this.changed.emit();
        },
        error: (err: unknown) => { // تحديد نوع الخطأ لتجنب خطأ Implicit Any
          this.isSaving.set(false);
          this.notify.show(apiErrorMessage(err, 'تعذر حفظ التسعير، حاول مرة أخرى'));
          // بعض العمليات ممكن تكون نجحت قبل الفشل، فنزامن الحالة مع السيرفر
          this.changed.emit();
        },
      });
  }
}
