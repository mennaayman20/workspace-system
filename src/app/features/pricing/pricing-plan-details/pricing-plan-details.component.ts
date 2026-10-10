import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, ArrowRight, Pencil } from 'lucide-angular';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { PricingRuleService } from '../../pricing/pricing-rule.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { WorkspaceType } from '../../../core/interfaces/Iworkspace';
import { WorkspaceTypePricingCardComponent } from '../components/workspace-type-pricing-card/workspace-type-pricing-card.component';
import { PlanFormModalComponent } from '../pricing-plans/plan-form-modal/plan-form-modal.component';
import { isReadyForCheckout, rulesToConfig } from '../pricing-rules.mapper';
import { PricingPlan, PricingRule } from '../Ipricing';

const NO_RULES: PricingRule[] = [];

@Component({
  selector: 'app-pricing-plan-details',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, WorkspaceTypePricingCardComponent, PlanFormModalComponent],
  templateUrl: './pricing-plan-details.component.html',
})
export class PricingPlanDetailsComponent implements OnInit {
  readonly ArrowBackIcon = ArrowRight;
  readonly EditIcon = Pencil;

  private readonly route = inject(ActivatedRoute);
  private readonly planService = inject(PricingPlanService);
  private readonly ruleService = inject(PricingRuleService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!Number.isInteger(this.planId) || this.planId <= 0) {
      this.errorMessage.set('رابط الخطة غير صحيح.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      plan: this.planService.getById(this.planId),
      rules: this.ruleService.getByPlan(this.planId),
      types: this.workspaceService.getWorkspaceTypes(true),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
          this.errorMessage.set(apiErrorMessage(err, 'تعذر تحميل بيانات الخطة، حاول مرة أخرى.'));
        },
      });
  }

  refreshRules(): void {
    this.ruleService
      .getByPlan(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rules) => this.rules.set(rules),
        error: () => this.toastr.error('تعذر تحديث الأسعار، حدّث الصفحة'),
      });
  }

  onPlanSaved(): void {
    this.isEditOpen.set(false);
    this.toastr.success('تم تحديث الخطة بنجاح');
    this.planService
      .getById(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => this.plan.set(plan),
        error: () => this.toastr.error('تعذر تحديث بيانات الخطة، حدّث الصفحة'),
      });
  }
}