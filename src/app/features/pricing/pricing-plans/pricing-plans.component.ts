import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideAngularModule, Plus, Search, Pencil, Trash2, CreditCard, ArrowLeft } from 'lucide-angular';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';
import { PricingPlan } from '../Ipricing';
import {
  PlanFormModalComponent,
  PlanFormResult,
} from './plan-form-modal/plan-form-modal.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-pricing-plans',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    PlanFormModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './pricing-plans.component.html',
})
export class PricingPlansComponent {
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly CardIcon = CreditCard;
  readonly ArrowIcon = ArrowLeft;

  private readonly planService = inject(PricingPlanService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lang = inject(LanguageService);
  private readonly search$ = new Subject<string>();
  private loadSub?: Subscription;

  readonly pageSize = 10;
  readonly statusOptions: { value: StatusFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'PRICING.PLANS.FILTERS.ALL' },
    { value: 'active', labelKey: 'PRICING.PLANS.FILTERS.ACTIVE' },
    { value: 'inactive', labelKey: 'PRICING.PLANS.FILTERS.INACTIVE' },
  ];

  readonly plans = signal<PricingPlan[]>([]);
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly deletingId = signal<number | null>(null);

  // Form modal
  readonly isFormOpen = signal(false);
  readonly editingPlan = signal<PricingPlan | null>(null);

  // Delete confirmation
  readonly pendingDelete = signal<PricingPlan | null>(null);
  readonly isDeleting = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
  readonly hasFilters = computed(() => this.searchTerm().trim() !== '' || this.statusFilter() !== 'all');

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.goToPage(1);
      });

    // بيشتغل أول مرة، وبعدين كل ما اللغة تتغير: يعيد جلب الداتا بالـ header الجديد
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.load());
    });

    this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());
  }

  load(): void {
    // بيلغي أي طلب قديم لسه شغال (تبديل لغة أو بحث سريع)
    this.loadSub?.unsubscribe();

    const status = this.statusFilter();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadSub = this.planService
      .getPlans({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
        search: this.searchTerm().trim() || undefined,
        isActive: status === 'all' ? undefined : status === 'active',
      })
      .subscribe({
        next: (result) => {
          this.plans.set(result?.items || []);
          this.totalCount.set(result?.totalCount || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.plans.set([]);
          this.errorMessage.set(apiErrorMessage(err, this.lang.t('PRICING.PLANS.ERRORS.LOAD')));
        },
      });
  }

  displayName(plan: PricingPlan): string {
    return plan.name || plan.nameAr || plan.nameEn || `#${plan.id}`;
  }

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

  // ---------- الإضافة والتعديل ----------
  openForm(plan?: PricingPlan): void {
    this.editingPlan.set(plan ?? null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingPlan.set(null);
  }

  onFormSaved(result: PlanFormResult): void {
    this.closeForm();
    if (result.isNew) {
      this.toastr.success(this.lang.t('PRICING.PLANS.TOAST.CREATED'));
      void this.router.navigate(['/pricing', result.id]);
    } else {
      this.toastr.success(this.lang.t('PRICING.PLANS.TOAST.UPDATED'));
      this.load();
    }
  }

  // ---------- الحذف ----------
  askDelete(plan: PricingPlan): void {
    this.pendingDelete.set(plan);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const plan = this.pendingDelete();
    if (!plan) return;

    this.isDeleting.set(true);
    this.deletingId.set(plan.id);

    this.planService
      .delete(plan.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deletingId.set(null);
          this.pendingDelete.set(null);
          this.toastr.success(this.lang.t('PRICING.PLANS.TOAST.DELETED'));
          if (this.plans().length === 1 && this.pageNumber() > 1) {
            this.pageNumber.update((p) => p - 1);
          }
          this.load();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.deletingId.set(null);
          this.toastr.error(apiErrorMessage(err, this.lang.t('PRICING.PLANS.ERRORS.DELETE')));
        },
      });
  }
}