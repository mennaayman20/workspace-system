import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { SelectModule } from 'primeng/select';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule, Building2, Plus, Pencil, Trash2, CheckCircle2, Users, CalendarClock, Wrench
} from 'lucide-angular';

import { WorkspaceService } from '../../core/services/workspace.service';
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

interface StatCard {
  value: WorkspaceStatus | 'all';
  label: string;
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
    RowActionsDirective
  ],
  templateUrl: './workspaces.component.html'
})
export class WorkspacesComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastr = inject(ToastrService);

  // icons
  readonly BuildingIcon = Building2;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  readonly statusOptions: { value: WorkspaceStatus; label: string }[] = [
    { value: 'Available', label: 'متاحة' },
    { value: 'Occupied', label: 'مشغولة' },
    { value: 'Reserved', label: 'محجوزة' },
    { value: 'Maintenance', label: 'صيانة' }
  ];

  // ---------- كروت الإحصائيات (بتشتغل كفلتر سريع) ----------
  readonly statCards: StatCard[] = [
    {
      value: 'all', label: 'إجمالي المساحات', icon: Building2,
      border: 'border-s-blue-500', tint: 'from-blue-50',
      chip: 'bg-blue-100 text-blue-600', ring: 'ring-blue-400'
    },
    {
      value: 'Available', label: 'متاحة', icon: CheckCircle2,
      border: 'border-s-emerald-500', tint: 'from-emerald-50',
      chip: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-400'
    },
    {
      value: 'Occupied', label: 'مشغولة', icon: Users,
      border: 'border-s-rose-500', tint: 'from-rose-50',
      chip: 'bg-rose-100 text-rose-600', ring: 'ring-rose-400'
    },
    {
      value: 'Reserved', label: 'محجوزة', icon: CalendarClock,
      border: 'border-s-amber-500', tint: 'from-amber-50',
      chip: 'bg-amber-100 text-amber-600', ring: 'ring-amber-400'
    },
    {
      value: 'Maintenance', label: 'صيانة', icon: Wrench,
      border: 'border-s-slate-500', tint: 'from-slate-100',
      chip: 'bg-slate-200 text-slate-600', ring: 'ring-slate-400'
    }
  ];

  // ---------- إعداد الجدول ----------
  readonly columns: TableColumn<Workspace>[] = [
    { key: 'name', header: 'المساحة', sortable: true, align: 'start' },
    { key: 'code', header: 'الكود', sortable: true },
    {
      key: 'floor',
      header: 'الطابق / الموقع',
      value: (w) => [w.floor, w.location].filter(Boolean).join(' • ') || null
    },
    {
      key: 'capacity',
      header: 'السعة',
      sortable: true,
      value: (w) => (w.capacity != null ? `${w.capacity} أفراد` : null)
    },
    {
      key: 'status',
      header: 'الحالة',
      type: 'badge',
      // الـ badges هي كمان مصدر اختيارات فلتر الحالة
      badges: {
        Available: { label: 'متاحة', class: BADGE.green },
        Occupied: { label: 'مشغولة', class: BADGE.red },
        Reserved: { label: 'محجوزة', class: BADGE.amber },
        Maintenance: { label: 'صيانة', class: BADGE.slate }
      }
    }
  ];

  readonly actions: TableAction<Workspace>[] = [
    { key: 'edit', label: 'تعديل', icon: Pencil, tone: 'primary', disabled: (w) => this.isBusy(w.id) },
    { key: 'delete', label: 'حذف', icon: Trash2, tone: 'danger', disabled: (w) => this.isBusy(w.id) }
  ];

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
    for (const s of this.statusOptions) counts[s.value] = 0;
    for (const ws of this.workspaces()) counts[ws.status] = (counts[ws.status] ?? 0) + 1;
    return counts;
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  // ---------- Loading ----------
  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
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
          this.errorMessage.set('تعذر تحميل البيانات، تأكد من الاتصال ثم أعد المحاولة.');
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
        error: () => this.toastr.warning('تم الحفظ لكن تعذر تحديث القائمة، حدّث الصفحة')
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
          this.toastr.error('تعذر تحميل بيانات المساحة، حاول مرة أخرى');
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
          this.toastr.success('تم تغيير حالة المساحة بنجاح');
        },
        error: (err) => {
          this.setBusy(ws.id, false);
          this.patchStatus(ws.id, previousStatus);
          this.toastr.error(err?.error?.message || 'حدث خطأ أثناء تغيير الحالة، تم التراجع');
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
          this.toastr.success('تم حذف المساحة بنجاح');
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.setBusy(ws.id, false);
          this.toastr.error(err?.error?.message || 'حدث خطأ أثناء الحذف، يرجى المحاولة لاحقاً');
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