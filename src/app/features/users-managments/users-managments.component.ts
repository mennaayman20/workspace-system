import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule, UserCog, ShieldCheck, X, Save, Search, ChevronLeft, ChevronRight, Users
} from 'lucide-angular';
import { SelectModule } from 'primeng/select';
import { ToastrService } from 'ngx-toastr';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { LanguageService } from '../../core/services/lang.service';

import {
  CellTemplateDirective,
  DataTableComponent,
  TableAction,
  TableActionEvent,
  TableColumn
} from '../../shared/components/data-table';
import { ToBodyDirective } from '../../shared/directives/to-body.directive';
import { UserManagementService } from './users.service';
import { AppUser } from './Iusers';

/**
 * ⚠️ مفيش endpoint لجلب الأدوار في اللي بعتّه، فعدّل القائمة دي بأسماء الأدوار
 * الفعلية في الباك إند. (الأدوار اللي بترجع مع المستخدمين بتتضاف تلقائي برضه)
 */
const KNOWN_ROLES = ['Admin', 'Manager', 'Employee', 'Customer'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    DataTableComponent,
    CellTemplateDirective,
    SelectModule,
    ToBodyDirective
  ],
  templateUrl: './users-managments.component.html',
  styleUrls: ['./users-managments.component.scss']
})
export class UserManagementComponent {
  private service = inject(UserManagementService);
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);
  private destroyRef = inject(DestroyRef);

  private loadSub?: Subscription;
  private search$ = new Subject<string>();

  // Icons
  readonly UsersIcon = Users;
  readonly RoleIcon = ShieldCheck;
  readonly UserCogIcon = UserCog;
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly SearchIcon = Search;
  readonly PrevIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;

  // Data
  users = signal<AppUser[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  readonly pageSize = 10;
  searchTerm = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));
  rangeFrom = computed(() => (this.totalCount() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize + 1));
  rangeTo = computed(() => Math.min(this.pageNumber() * this.pageSize, this.totalCount()));

  // Modal
  pendingUser = signal<AppUser | null>(null);
  isSubmitting = signal(false);
  formError = signal<string | null>(null);
  roleControl = new FormControl<string | null>(null, [Validators.required]);

  /** الأدوار المتاحة = المعروفة + اللي ظهرت في بيانات المستخدمين */
  roleOptions = computed(() => {
    const set = new Set<string>(KNOWN_ROLES);
    for (const u of this.users()) u.roles.forEach(r => set.add(r));
    return [...set].map(r => ({ value: r, label: r }));
  });

  // ---------- الجدول ----------
  readonly columns = computed<TableColumn<AppUser>[]>(() => {
    this.lang.currentLang();
    const t = (k: string) => this.lang.t(k);
    return [
      { key: 'fullName', header: t('USERS.COLUMNS.USER'), align: 'start' },
      { key: 'userName', header: t('USERS.COLUMNS.USERNAME'), type: 'mono' },
      { key: 'email', header: t('USERS.COLUMNS.EMAIL'), type: 'mono' },
      { key: 'roles', header: t('USERS.COLUMNS.ROLES') }
    ];
  });

  readonly actions = computed<TableAction<AppUser>[]>(() => {
    this.lang.currentLang();
    return [
      {
        key: 'assignRole',
        label: this.lang.t('USERS.ACTIONS.ASSIGN_ROLE'),
        icon: ShieldCheck,
        tone: 'primary',
        // الـ API بيسمح بإضافة دور لمستخدم ملوش دور بس
        visible: (u: AppUser) => u.roles.length === 0
      }
    ];
  });

  onAction(e: TableActionEvent<AppUser>): void {
    if (e.key === 'assignRole') this.openAssignModal(e.row);
  }

  constructor() {
    // إعادة الجلب لما اللغة تتغير
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.loadUsers());
    });

    // بحث بـ debounce من السيرفر
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.pageNumber.set(1);
        this.loadUsers();
      });
  }

  // ---------- Loading ----------
  loadUsers(): void {
    this.loadSub?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadSub = this.service.getUsers(this.pageNumber(), this.pageSize, this.searchTerm()).subscribe({
      next: res => {
        this.users.set(res.items);
        this.totalCount.set(res.totalCount);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error fetching users:', err);
        this.errorMessage.set(this.extractError(err, this.lang.t('USERS.ERRORS.LOAD')));
        this.isLoading.set(false);
      }
    });
  }

  private refreshSilently(): void {
    this.service.getUsers(this.pageNumber(), this.pageSize, this.searchTerm()).subscribe({
      next: res => {
        this.users.set(res.items);
        this.totalCount.set(res.totalCount);
      },
      error: err => console.error('Silent refresh failed:', err)
    });
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadUsers();
  }

  // ---------- Modal ----------
  openAssignModal(user: AppUser): void {
    this.pendingUser.set(user);
    this.formError.set(null);
    this.roleControl.reset(null);
  }

  closeModal(): void {
    if (this.isSubmitting()) return;
    this.pendingUser.set(null);
    this.formError.set(null);
    this.roleControl.reset(null);
  }

  saveRole(): void {
    const user = this.pendingUser();
    if (!user) return;
    if (this.roleControl.invalid) {
      this.roleControl.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);

    this.service.assignRole(user.id, this.roleControl.value!).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.toastr.success(this.lang.t('USERS.TOAST.ROLE_ASSIGNED'));
        this.refreshSilently();
      },
      error: err => {
        console.error('Error assigning role:', err);
        this.isSubmitting.set(false);
        const fallbackKey =
          err?.status === 409 ? 'USERS.ERRORS.ALREADY_HAS_ROLE'
          : err?.status === 404 ? 'USERS.ERRORS.NOT_FOUND'
          : 'USERS.ERRORS.ASSIGN';
        this.formError.set(this.extractError(err, this.lang.t(fallbackKey)));
      }
    });
  }

  // ---------- Helpers ----------
  private extractError(err: any, fallback: string): string {
    const e = err?.error;
    if (typeof e === 'string' && e.trim()) return e;
    if (e?.detail) return e.detail;
    if (e?.message) return e.message;
    if (e?.title && err?.status !== 409) return e.title;
    if (e?.errors) {
      const first = (Object.values(e.errors).flat() as any[])[0];
      if (typeof first === 'string') return first;
      if (first?.description) return first.description;
    }
    return fallback;
  }
}