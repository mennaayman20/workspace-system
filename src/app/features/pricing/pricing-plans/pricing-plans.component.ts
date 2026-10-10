import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideAngularModule, Plus, Search, Pencil, Trash2, CreditCard } from 'lucide-angular';

import { PricingPlanService } from '../../pricing/pricing-plan.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { PricingPlan } from '../Ipricing';
import {
  PlanFormModalComponent,
  PlanFormResult,
} from './plan-form-modal/plan-form-modal.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-pricing-plans',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, PlanFormModalComponent],
  templateUrl: './pricing-plans.component.html',
})
export class PricingPlansComponent implements OnInit {
  readonly PlusIcon = Plus;
  readonly SearchIcon = Search;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly CardIcon = CreditCard;

  private readonly planService = inject(PricingPlanService);
  private readonly toastr = inject(ToastrService);
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
  }

  ngOnInit(): void {
    this.load();
  }

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
          this.plans.set(result?.items || []);
          this.totalCount.set(result?.totalCount || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.plans.set([]);
          this.errorMessage.set(apiErrorMessage(err, 'تعذر تحميل خطط التسعير، حاول مرة أخرى.'));
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
      this.toastr.success('تم إنشاء الخطة، حدّد الآن أسعار أنواع المساحات');
      void this.router.navigate(['/pricing', result.id]);
    } else {
      this.toastr.success('تم تحديث الخطة بنجاح');
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
          this.toastr.success('تم حذف الخطة بنجاح');
          if (this.plans().length === 1 && this.pageNumber() > 1) {
            this.pageNumber.update((p) => p - 1);
          }
          this.load();
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.deletingId.set(null);
          this.toastr.error(apiErrorMessage(err, 'تعذر حذف الخطة'));
        },
      });
  }
}