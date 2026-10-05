import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { filter, forkJoin } from 'rxjs';

// استيراد Lucide Icons
import { LucideAngularModule, ArrowRight, Pencil } from 'lucide-angular';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { PricingRuleService } from '../../pricing/pricing-rule.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { NotifyService } from '../../pricing/notify.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { WorkspaceType } from '../../../core/interfaces/Iworkspace';
import { WorkspaceTypePricingCardComponent } from '../components/workspace-type-pricing-card/workspace-type-pricing-card.component';
import { isReadyForCheckout, rulesToConfig } from '../pricing-rules.mapper';
import { PricingPlan, PricingRule } from '../Ipricing';
import {
  PlanFormDialogComponent,
  PlanFormDialogData,
  PlanFormResult,
} from '../pricing-plans/plan-form-dialog/plan-form-dialog.component';

const NO_RULES: PricingRule[] = [];

@Component({
  selector: 'app-pricing-plan-details',
  standalone: true,
  // استبدال MatIconModule بـ LucideAngularModule
  imports: [RouterLink, LucideAngularModule, WorkspaceTypePricingCardComponent],
  templateUrl: './pricing-plan-details.component.html',
})
export class PricingPlanDetailsComponent implements OnInit {
  // تعريف الأيقونات للاستخدام في الـ Template
  readonly ArrowBackIcon = ArrowRight; // تم استخدام ArrowRight لتتناسب مع اتجاه العودة للواجهات العربية (RTL)
  readonly EditIcon = Pencil;

  private readonly route = inject(ActivatedRoute);
  private readonly planService = inject(PricingPlanService);
  private readonly ruleService = inject(PricingRuleService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly planId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly noRules = NO_RULES;

  readonly plan = signal<PricingPlan | null>(null);
  readonly rules = signal<PricingRule[]>([]);
  readonly workspaceTypes = signal<WorkspaceType[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
      this.workspaceTypes().filter((type) =>
        isReadyForCheckout(rulesToConfig(this.rulesByType().get(type.id) ?? NO_RULES)),
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
        next: ({ plan, rules, types }: any) => {
          const planData = plan?.data || plan;
          this.plan.set(planData);

          const rulesList = Array.isArray(rules)
            ? rules
            : rules?.data?.items || rules?.data || rules?.items || [];
          this.rules.set(rulesList);

          const typesList = Array.isArray(types)
            ? types
            : types?.data?.items || types?.data || types?.items || [];
          this.workspaceTypes.set(typesList);

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
        next: (rules: any) => {
          const rulesList = Array.isArray(rules)
            ? rules
            : rules?.data?.items || rules?.data || rules?.items || [];
          this.rules.set(rulesList);
        },
        error: () => this.notify.show('تعذر تحديث الأسعار، حدّث الصفحة'),
      });
  }

  editPlan(): void {
    const plan = this.plan();
    if (!plan) return;

    this.dialog
      .open<PlanFormDialogComponent, PlanFormDialogData, PlanFormResult>(PlanFormDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: { plan },
      })
      .afterClosed()
      .pipe(
        filter((result): result is PlanFormResult => !!result),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.notify.show('تم تحديث الخطة بنجاح');
        this.reloadPlan();
      });
  }

  private reloadPlan(): void {
    this.planService
      .getById(this.planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((plan) => this.plan.set(plan));
  }
}