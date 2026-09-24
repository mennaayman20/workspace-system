import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';

import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace, WorkspaceType, WorkspaceStatus } from '../../core/interfaces/Iworkspace';
import { CreateWorkspaceModalComponent } from './add-workspace-modal/add-workspace-modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CreateWorkspaceModalComponent, MatSnackBarModule, MatDialogModule ],
  templateUrl: './workspaces.component.html'
})
export class WorkspacesComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly statusOptions: { value: WorkspaceStatus; label: string }[] = [
    { value: 'Available', label: 'متاحة' },
    { value: 'Occupied', label: 'مشغولة' },
    { value: 'Reserved', label: 'محجوزة' },
    { value: 'Maintenance', label: 'صيانة' }
  ];

  // Data
  workspaces = signal<Workspace[]>([]);
  workspaceTypes = signal<WorkspaceType[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Modal
  isModalOpen = signal(false);
  editingWorkspace = signal<Workspace | null>(null);

  // Filters
  searchTerm = signal('');
  statusFilter = signal<WorkspaceStatus | 'all'>('all');

  // ids of rows currently being changed/deleted (prevents double clicks)
  busyIds = signal<ReadonlySet<number>>(new Set());

  filteredWorkspaces = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.workspaces().filter((ws) => {
      const matchesStatus = status === 'all' || ws.status === status;
      const matchesTerm =
        !term ||
        [ws.name, ws.code, ws.floor, ws.location].some((v) => (v ?? '').toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
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
        error: () => this.showToast('تم الحفظ لكن تعذر تحديث القائمة، حدّث الصفحة', 'إغلاق')
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
          this.showToast('تعذر تحميل بيانات المساحة، حاول مرة أخرى', 'إغلاق');
        }
      });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingWorkspace.set(null);
  }

  // ---------- Status ----------
  onStatusChange(ws: Workspace, newStatus: WorkspaceStatus): void {
    if (ws.status === newStatus || this.isBusy(ws.id)) return;

    const previousStatus = ws.status;
    this.setBusy(ws.id, true);
    this.patchStatus(ws.id, newStatus); // optimistic

    this.workspaceService
      .changeWorkspaceStatus(ws.id, { id: ws.id, status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setBusy(ws.id, false);
          this.showToast('تم تغيير حالة المساحة بنجاح', 'حسناً');
        },
        error: () => {
          this.setBusy(ws.id, false);
          this.patchStatus(ws.id, previousStatus);
          this.showToast('حدث خطأ أثناء تغيير الحالة، تم التراجع', 'إغلاق');
        }
      });
  }

  // ---------- Delete ----------
  onDelete(ws: Workspace): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الحذف',
        message: `هل أنت متأكد من حذف المساحة "${ws.name}"؟`
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.executeDelete(ws.id);
    });
  }

  private executeDelete(id: number): void {
    this.setBusy(id, true);
    this.workspaceService
      .deleteWorkspace(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setBusy(id, false);
          this.workspaces.update((items) => items.filter((i) => i.id !== id));
          this.showToast('تم حذف المساحة بنجاح', 'حسناً');
        },
        error: () => {
          this.setBusy(id, false);
          this.showToast('حدث خطأ أثناء الحذف، يرجى المحاولة لاحقاً', 'إغلاق');
        }
      });
  }

  // ---------- Filters ----------
  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onFilterStatus(value: string): void {
    this.statusFilter.set(value as WorkspaceStatus | 'all');
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
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

  private showToast(message: string, action = 'إغلاق'): void {
    this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  statusLabel(status: WorkspaceStatus): string {
    return this.statusOptions.find((s) => s.value === status)?.label ?? status;
  }

  getStatusBadgeClass(status: WorkspaceStatus): string {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'Occupied':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case 'Reserved':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'Maintenance':
        return 'bg-slate-100 text-slate-700 ring-slate-500/20';
      default:
        return 'bg-slate-100 text-slate-600 ring-slate-500/20';
    }
  }
}