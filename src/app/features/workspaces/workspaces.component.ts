import { Component, inject, signal, computed, effect, untracked, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { SelectModule } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, Subscription } from 'rxjs';
import {
  LucideAngularModule, Building2, Plus, Pencil, Trash2, CheckCircle2, Users, CalendarClock, Wrench
} from 'lucide-angular';

import { WorkspaceService } from '../../core/services/workspace.service';
import { LanguageService } from '../../core/services/lang.service'; // عدّل المسار لو مختلف
import { Workspace, WorkspaceType, WorkspaceStatus } from '../../core/interfaces/Iworkspace';
import { CreateWorkspaceModalComponent } from './add-workspace-modal/add-workspace-modal.component';
import {
  BADGE,
  CellTemplateDirective,
  DataTableComponent,
  RowActionsDirective,
  TableAction,
  TableActionEvent,
  TableColumn
} from '../../shared/components/data-table';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

interface StatCard {
  value: WorkspaceStatus | 'all';
  /** مفتاح الترجمة (بيتترجم في الـ HTML بالـ pipe) */
  labelKey: string;
  icon: any;
  /** كلاسات Tailwind لازم تتكتب كاملة عشان تتلقط في الـ build */
  border: string;
  tint: string;
  chip: string;
  ring: string;
}

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    LucideAngularModule,
    CreateWorkspaceModalComponent,
    DataTableComponent,
    CellTemplateDirective,
    RowActionsDirective,
    ConfirmDialogComponent,
    TranslatePipe
  ],
  templateUrl: './workspaces.component.html'
})
export class WorkspacesComponent {
  private readonly workspaceService = inject(WorkspaceService);
  
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);
  private readonly lang = inject(LanguageService);

  private loadSub?: Subscription;

  // icons
  readonly BuildingIcon = Building2;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  constructor() {
    // بيشتغل أول مرة، وبعدين كل ما اللغة تتغير: يعيد جلب الداتا بالـ header الجديد
    effect(() => {
      this.lang.currentLang();
      untracked(() => this.loadInitialData());
    });
  }

  private readonly statusValues: WorkspaceStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];

  readonly statusOptions = computed(() =>
    this.statusValues.map((v) => ({
      value: v,
      label: this.lang.t('WORKSPACES.STATUS.' + v.toUpperCase())
    }))
  );

  // ---------- كروت الإحصائيات (بتشتغل كفلتر سريع) ----------
  readonly statCards: StatCard[] = [
    {
      value: 'all', labelKey: 'WORKSPACES.STATUS.ALL', icon: Building2,
      border: 'border-s-blue-500', tint: 'from-blue-50',
      chip: 'bg-blue-100 text-blue-600', ring: 'ring-blue-400'
    },
    {
      value: 'Available', labelKey: 'WORKSPACES.STATUS.AVAILABLE', icon: CheckCircle2,
      border: 'border-s-emerald-500', tint: 'from-emerald-50',
      chip: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-400'
    },
    {
      value: 'Occupied', labelKey: 'WORKSPACES.STATUS.OCCUPIED', icon: Users,
      border: 'border-s-rose-500', tint: 'from-rose-50',
      chip: 'bg-rose-100 text-rose-600', ring: 'ring-rose-400'
    },
    {
      value: 'Reserved', labelKey: 'WORKSPACES.STATUS.RESERVED', icon: CalendarClock,
      border: 'border-s-amber-500', tint: 'from-amber-50',
      chip: 'bg-amber-100 text-amber-600', ring: 'ring-amber-400'
    },
    {
      value: 'Maintenance', labelKey: 'WORKSPACES.STATUS.MAINTENANCE', icon: Wrench,
      border: 'border-s-slate-500', tint: 'from-slate-100',
      chip: 'bg-slate-200 text-slate-600', ring: 'ring-slate-400'
    }
  ];

  // ---------- إعداد الجدول (computed عشان يتحدث مع اللغة) ----------
  readonly columns = computed<TableColumn<Workspace>[]>(() => {
    const t = (k: string, p?: Record<string, unknown>) => this.lang.t(k, p);
    return [
      { key: 'name', header: t('WORKSPACES.COLUMNS.WORKSPACE'), sortable: true, align: 'start' },
      { key: 'code', header: t('WORKSPACES.COLUMNS.CODE'), sortable: true },
      {
        key: 'floor',
        header: t('WORKSPACES.COLUMNS.FLOOR_LOCATION'),
        value: (w) => [w.floor, w.location].filter(Boolean).join(' • ') || null
      },
      {
        key: 'capacity',
        header: t('WORKSPACES.COLUMNS.CAPACITY'),
        sortable: true,
        value: (w) => (w.capacity != null ? t('WORKSPACES.CAPACITY_VALUE', { count: w.capacity }) : null)
      },
      {
        key: 'status',
        header: t('WORKSPACES.COLUMNS.STATUS'),
        type: 'badge',
        // الـ badges هي كمان مصدر اختيارات فلتر الحالة
        badges: {
          Available: { label: t('WORKSPACES.STATUS.AVAILABLE'), class: BADGE.green },
          Occupied: { label: t('WORKSPACES.STATUS.OCCUPIED'), class: BADGE.red },
          Reserved: { label: t('WORKSPACES.STATUS.RESERVED'), class: BADGE.amber },
          Maintenance: { label: t('WORKSPACES.STATUS.MAINTENANCE'), class: BADGE.slate }
        }
      }
    ];
  });

  readonly actions = computed<TableAction<Workspace>[]>(() => [
    {
      key: 'edit', label: this.lang.t('WORKSPACES.ACTIONS.EDIT'), icon: Pencil, tone: 'primary',
      disabled: (w) => this.isBusy(w.id)
    },
    {
      key: 'delete', label: this.lang.t('WORKSPACES.ACTIONS.DELETE'), icon: Trash2, tone: 'danger',
      disabled: (w) => this.isBusy(w.id)
    }
  ]);

  readonly rowClass = (w: Workspace): string =>
    this.isBusy(w.id) ? 'opacity-50 pointer-events-none' : '';

  onAction(e: TableActionEvent<Workspace>): void {
    if (e.key === 'edit') this.openEditModal(e.row);
    if (e.key === 'delete') this.askDelete(e.row);
  }

  // Data
  workspaces = signal<Workspace[]>([]);
  workspaceTypes = signal<WorkspaceType[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Modal
  isModalOpen = signal(false);
  editingWorkspace = signal<Workspace | null>(null);

  // Delete confirmation
  pendingDelete = signal<Workspace | null>(null);
  isDeleting = signal(false);

  // Quick filter (stat cards)
  statusFilter = signal<WorkspaceStatus | 'all'>('all');

  // ids of rows currently being changed/deleted (prevents double clicks)
  busyIds = signal<ReadonlySet<number>>(new Set());

  /** الجدول نفسه بيتكفل بالبحث والفلاتر والـ pagination؛ هنا بس فلتر الكروت */
  filteredWorkspaces = computed(() => {
    const status = this.statusFilter();
    const list = this.workspaces();
    return status === 'all' ? list : list.filter((ws) => ws.status === status);
  });

  statusCounts = computed(() => {
    const counts: Record<string, number> = { all: this.workspaces().length };
    for (const s of this.statusValues) counts[s] = 0;
    for (const ws of this.workspaces()) counts[ws.status] = (counts[ws.status] ?? 0) + 1;
    return counts;
  });

  // ---------- Loading ----------
  loadInitialData(): void {
    // بيلغي أي طلب قديم لسه شغال (لو المستخدم بدّل اللغة بسرعة)
    this.loadSub?.unsubscribe();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadSub = forkJoin({
      types: this.workspaceService.getWorkspaceTypes(true),
      workspaces: this.workspaceService.getWorkspaces(true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ types, workspaces }) => {
          this.workspaceTypes.set(types);
          this.workspaces.set(workspaces);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set(this.lang.t('WORKSPACES.LOAD_ERROR'));
        }
      });
  }

  /** Silent refresh after add/edit: keeps the table visible (no flicker). */
  refreshAfterSave(): void {
    forkJoin({
      types: this.workspaceService.getWorkspaceTypes(true),
      workspaces: this.workspaceService.getWorkspaces(true)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ types, workspaces }) => {
          this.workspaceTypes.set(types);
          this.workspaces.set(workspaces);
        },
        error: () => this.toastr.warning(this.lang.t('WORKSPACES.MSG.REFRESH_FAILED'))
      });
  }

  // ---------- Modal ----------
  openAddModal(): void {
    this.editingWorkspace.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(ws: Workspace): void {
    this.setBusy(ws.id, true);
    // Fetch fresh data so the form never edits a stale row
    this.workspaceService
      .getWorkspaceById(ws.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => {
          this.setBusy(ws.id, false);
          this.editingWorkspace.set(fresh);
          this.isModalOpen.set(true);
        },
        error: () => {
          this.setBusy(ws.id, false);
          this.toastr.error(this.lang.t('WORKSPACES.MSG.LOAD_ONE_ERROR'));
        }
      });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingWorkspace.set(null);
  }

  // ---------- Status ----------
  onStatusChange(ws: Workspace, newStatus: WorkspaceStatus): void {
    if (!newStatus || ws.status === newStatus || this.isBusy(ws.id)) return;

    const previousStatus = ws.status;
    this.setBusy(ws.id, true);
    this.patchStatus(ws.id, newStatus); // optimistic

    this.workspaceService
      .changeWorkspaceStatus(ws.id, { id: ws.id, status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setBusy(ws.id, false);
          this.toastr.success(this.lang.t('WORKSPACES.MSG.STATUS_CHANGED'));
        },
        error: (err) => {
          this.setBusy(ws.id, false);
          this.patchStatus(ws.id, previousStatus);
          this.toastr.error(err?.error?.message || this.lang.t('WORKSPACES.MSG.STATUS_ERROR'));
        }
      });
  }

  // ---------- Delete ----------
  askDelete(ws: Workspace): void {
    this.pendingDelete.set(ws);
  }

  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const ws = this.pendingDelete();
    if (!ws) return;

    this.isDeleting.set(true);
    this.setBusy(ws.id, true);

    this.workspaceService
      .deleteWorkspace(ws.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.setBusy(ws.id, false);
          this.pendingDelete.set(null);
          this.workspaces.update((items) => items.filter((i) => i.id !== ws.id));
          this.toastr.success(this.lang.t('WORKSPACES.DELETE.SUCCESS'));
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.setBusy(ws.id, false);
          this.toastr.error(err?.error?.message || this.lang.t('WORKSPACES.DELETE.ERROR'));
        }
      });
  }

  // ---------- Filters ----------
  onFilterStatus(value: string): void {
    this.statusFilter.set(value as WorkspaceStatus | 'all');
  }

  // ---------- Helpers ----------
  isBusy(id: number): boolean {
    return this.busyIds().has(id);
  }

  private setBusy(id: number, busy: boolean): void {
    this.busyIds.update((set) => {
      const next = new Set(set);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }

  private patchStatus(id: number, status: WorkspaceStatus): void {
    this.workspaces.update((items) => items.map((i) => (i.id === id ? { ...i, status } : i)));
  }
}