import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
import { LucideAngularModule, ArrowRight, Pencil } from 'lucide-angular';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { PricingRuleService } from '../../pricing/pricing-rule.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف
import { WorkspaceType } from '../../../core/interfaces/Iworkspace';
import { WorkspaceTypePricingCardComponent } from '../components/workspace-type-pricing-card/workspace-type-pricing-card.component';
import { PlanFormModalComponent } from '../pricing-plans/plan-form-modal/plan-form-modal.component';
import { isReadyForCheckout, rulesToConfig } from '../pricing-rules.mapper';
import { PricingPlan, PricingRule } from '../Ipricing';

const NO_RULES: PricingRule[] = [];

@Component({
  selector: 'app-pricing-plan-details',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    WorkspaceTypePricingCardComponent,
    PlanFormModalComponent,
  ],
  templateUrl: './pricing-plan-details.component.html',
})
export class PricingPlanDetailsComponent {
  readonly ArrowBackIcon = ArrowRight;
  readonly EditIcon = Pencil;

  private readonly route = inject(ActivatedRoute);
  private readonly planService = inject(PricingPlanService);
  private readonly ruleService = inject(PricingRuleService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lang = inject(LanguageService);
  private loadSub?: Subscription;

  private readonly planId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly noRules = NO_RULES;

  readonly plan = signal<PricingPlan | null>(null);
  readonly rules = signal<PricingRule[]>([]);
  readonly workspaceTypes = signal<WorkspaceType[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditOpen = signal(false);

  readonly rulesByType = computed(() => {
    const grouped = new Map<number, PricingRule[]>();
    for (const rule of this.rules()) {
      const list = grouped.get(rule.workspaceTypeId) ?? [];
      list.push(rule);
      grouped.set(rule.workspaceTypeId, list);
    }
    return grouped;
  });

  readonly readyCount = computed(
    () =>
      this.workspaceTypes().filter((t) =>
        isReadyForCheckout(rulesToConfig(this.rulesByType().get(t.id) ?? NO_RULES)),
      ).length,
  );

  constructor() {
    // أول مرة + كل ما اللغة تتغير (أسماء الخطة وأنواع المساحات راجعة مترجمة من الباك)
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.load());
    });

    this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());
  }

  load(): void {
    if (!Number.isInteger(this.planId) || this.planId <= 0) {
      this.errorMessage.set(this.lang.t('PRICING.DETAILS.ERRORS.INVALID_LINK'));
      return;
    }

    this.loadSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadSub = forkJoin({
      plan: this.planService.getById(this.planId),
      rules: this.ruleService.getByPlan(this.planId),
      types: this.workspaceService.getWorkspaceTypes(true),
    }).subscribe({
      next: ({ plan, rules, types }) => {
        this.plan.set(plan);
        this.rules.set(rules);
        // شيل الـ cast ده لو getWorkspaceTypes بيرجّع WorkspaceType[] فعلًا
        const list = types as any;
        this.workspaceTypes.set(Array.isArray(list) ? list : (list?.items ?? list?.data?.items ?? list?.data ?? []));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(apiErrorMessage(err, this.lang.t('PRICING.DETAILS.ERRORS.LOAD')));
      },
    });
  }

  refreshRules(): void {
    this.ruleService
      .getByPlan(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rules) => this.rules.set(rules),
        error: () => this.toastr.error(this.lang.t('PRICING.DETAILS.ERRORS.REFRESH_RULES')),
      });
  }

  onPlanSaved(): void {
    this.isEditOpen.set(false);
    this.toastr.success(this.lang.t('PRICING.DETAILS.TOAST.PLAN_UPDATED'));
    this.planService
      .getById(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => this.plan.set(plan),
        error: () => this.toastr.error(this.lang.t('PRICING.DETAILS.ERRORS.REFRESH_PLAN')),
      });
  }
}