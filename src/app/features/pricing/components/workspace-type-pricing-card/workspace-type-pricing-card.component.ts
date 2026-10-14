import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';

import { PricingRuleService } from '../../pricing-rule.service';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { LanguageService } from '../../../../core/services/lang.service'; // عدّل المسار لو مختلف
import { WorkspaceType } from '../../../../core/interfaces/Iworkspace';
import { configToOperations, isReadyForCheckout, rulesToConfig } from '../../pricing-rules.mapper';
import { PricingRule, TypePricingConfig } from '../../Ipricing';
import { TypePricingFormComponent } from '../type-pricing-form/type-pricing-form.component';

/** Card لنوع مساحة واحد داخل الخطة: بيعرض الحالة وبيحفظ التسعير. */
@Component({
  selector: 'app-workspace-type-pricing-card',
  standalone: true,
  imports: [TypePricingFormComponent, LucideAngularModule, TranslatePipe],
  templateUrl: './workspace-type-pricing-card.component.html',
})
export class WorkspaceTypePricingCardComponent {
  readonly ChevronDownIcon = ChevronDown;

  private readonly ruleService = inject(PricingRuleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);
  private readonly lang = inject(LanguageService);

  readonly planId = input.required<number>();
  readonly workspaceType = input.required<WorkspaceType>();
  readonly rules = input.required<PricingRule[]>();
  /** بيتنادى بعد أي محاولة حفظ عشان الصفحة تعمل refresh للقواعد. */
  readonly changed = output<void>();

  readonly isSaving = signal(false);
  private readonly manualToggle = signal<boolean | null>(null);
  /** مفتوح تلقائيًا لو النوع لسه ملوش سعر، إلا لو المستخدم غيّر بنفسه */
  readonly isOpen = computed(() => this.manualToggle() ?? !this.isReady());

  readonly config = computed(() => rulesToConfig(this.rules()));
  readonly isReady = computed(() => isReadyForCheckout(this.config()));

  toggle(): void {
    this.manualToggle.set(!this.isOpen());
  }

  onSave(config: TypePricingConfig): void {
    const operations = configToOperations(this.planId(), this.workspaceType().id, this.rules(), config);
    if (operations.length === 0) {
      this.toastr.info(this.lang.t('PRICING.CARD.TOAST.NO_CHANGES'));
      return;
    }

    this.isSaving.set(true);
    this.ruleService
      .applyOperations(operations)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.manualToggle.set(false); // اقفل الكارت بعد الحفظ صراحةً
          this.toastr.success(this.lang.t('PRICING.CARD.TOAST.SAVED'));
          this.changed.emit();
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.toastr.error(apiErrorMessage(err, this.lang.t('PRICING.CARD.ERRORS.SAVE')));
          // مفيش changed.emit هنا: عشان الفورم ميتمسحش
        },
      });
  }
}