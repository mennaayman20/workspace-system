import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, filter } from 'rxjs';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { NotifyService } from '../../pricing/notify.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PricingPlan } from '../Ipricing';
import {
  PlanFormDialogComponent,
  PlanFormDialogData,
  PlanFormResult,
} from './plan-form-dialog/plan-form-dialog.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-pricing-plans',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './pricing-plans.component.html',
})
export class PricingPlansComponent implements OnInit {
  private readonly planService = inject(PricingPlanService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly pageSize = 10;
  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشطة' },
    { value: 'inactive', label: 'غير نشطة' },
  ];

  readonly plans = signal<PricingPlan[]>([]);
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly deletingId = signal<number | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
  readonly hasFilters = computed(() => this.searchTerm().trim() !== '' || this.statusFilter() !== 'all');

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.goToPage(1);
      });
  }

  ngOnInit(): void {
    this.load();
  }
// ---------- Loading ----------
load(): void {
  const status = this.statusFilter();
  this.isLoading.set(true);
  this.errorMessage.set(null);

  this.planService
    .getPlans({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize,
      search: this.searchTerm().trim() || undefined,
      isActive: status === 'all' ? undefined : status === 'active',
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (result) => {
        // result هنا هو كائن PagedResult الذي يحتوي على items و totalCount
        const plansList = result?.items || [];
        const count = result?.totalCount || 0;

        this.plans.set(plansList);
        this.totalCount.set(count);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.plans.set([]);
        this.errorMessage.set(apiErrorMessage(err, 'تعذر تحميل خطط التسعير، حاول مرة أخرى.'));
      },
    });
}

  // ---------- Filters & paging ----------
  onSearch(value: string): void {
    this.search$.next(value);
  }

  onFilterStatus(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.goToPage(1);
  }

  goToPage(page: number): void {
    this.pageNumber.set(page);
    this.load();
  }

  // ---------- Create / Edit ----------
  openForm(plan?: PricingPlan): void {
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
      .subscribe((result) => {
        if (result.isNew) {
          // خطة من غير أسعار ملهاش قيمة، فننقل المستخدم مباشرة لتحديد الأسعار
          this.notify.show('تم إنشاء الخطة، حدّد الآن أسعار أنواع المساحات');
          void this.router.navigate(['/pricing', result.id]);
        } else {
          this.notify.show('تم تحديث الخطة بنجاح');
          this.load();
        }
      });
  }

  // ---------- Delete ----------
  onDelete(plan: PricingPlan): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'تأكيد الحذف',
          message: `هل أنت متأكد من حذف الخطة "${plan.name}"؟`,
        },
      })
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.executeDelete(plan.id));
  }

  private executeDelete(id: number): void {
    this.deletingId.set(id);

    this.planService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notify.show('تم حذف الخطة بنجاح');
          // لو كانت آخر عنصر في الصفحة نرجع صفحة لورا
          if (this.plans().length === 1 && this.pageNumber() > 1) this.pageNumber.update((p) => p - 1);
          this.load();
        },
        error: (err) => {
          this.deletingId.set(null);
          // 409: الخطة عليها أسعار أو مربوطة بشركة → نعرض رسالة الـ API
          this.notify.show(apiErrorMessage(err, 'تعذر حذف الخطة'));
        },
      });
  }
}
