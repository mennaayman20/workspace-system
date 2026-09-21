import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceService } from '../../core/services/workspace.service';
import { CreateWorkspaceDto, Workspace, WorkspaceStatus } from '../../core/interfaces/Iworkspace';
import { AddWorkspaceModalComponent } from '../workspaces/add-workspace-modal/add-workspace-modal.component';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, AddWorkspaceModalComponent], // استيراد المودال الفرعي هنا
  templateUrl: './workspaces.component.html'
})
export class WorkspacesComponent implements OnInit {
  workspaces: Workspace[] = [];
  filteredWorkspaces: Workspace[] = [];

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  isAddModalOpen: boolean = false;
  errorMessage: string | null = null;
  selectedStatusFilter: string = 'ALL';

  selectedWorkspaceToEdit: Workspace | null = null;

  constructor(private workspaceService: WorkspaceService) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.workspaceService.getWorkspaces().subscribe({
      next: (data) => {
        this.workspaces = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'حدث خطأ أثناء جلب البيانات';
        this.isLoading = false;
      }
    });
  }



  // الاستجابة لحدث حفظ النموذج من المودال الفرعي
  onWorkspaceCreated(dto: CreateWorkspaceDto): void {
    this.isSubmitting = true;
    this.workspaceService.createWorkspace(dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.loadWorkspaces(); // إعادة التحميل لضمان تحديث الواجهة
      },
      error: () => {
        this.isSubmitting = false;
        alert('حدث خطأ أثناء حفظ البيانات');
      }
    });
  }

  applyFilter(): void {
    if (this.selectedStatusFilter === 'ALL') {
      this.filteredWorkspaces = [...this.workspaces];
    } else {
      this.filteredWorkspaces = this.workspaces.filter(w => w.status === this.selectedStatusFilter);
    }
  }

  onFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilter();
  }



  openAddModal(): void {
  this.selectedWorkspaceToEdit = null;
  this.isAddModalOpen = true;
}

// فتح المودال للتعديل
openEditModal(item: Workspace): void {
  this.selectedWorkspaceToEdit = item;
  this.isAddModalOpen = true;
}

closeAddModal(): void {
  this.isAddModalOpen = false;
  this.selectedWorkspaceToEdit = null;
}





// معالجة الحفظ (سواء إضافة أو تعديل)
onSaveWorkspace(event: { id?: string; data: CreateWorkspaceDto }): void {
  this.isSubmitting = true;

  if (event.id) {
    // حالة التعديل
    this.workspaceService.updateWorkspace(event.id, event.data).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.loadWorkspaces();
      },
      error: () => (this.isSubmitting = false)
    });
  } else {
    // حالة الإضافة
    this.workspaceService.createWorkspace(event.data).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.loadWorkspaces();
      },
      error: () => (this.isSubmitting = false)
    });
  }
}
  getStatusBadgeClass(status: WorkspaceStatus): string {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Occupied': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Reserved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maintenance': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getStatusLabel(status: WorkspaceStatus): string {
    switch (status) {
      case 'Available': return 'متاح';
      case 'Occupied': return 'مشغول';
      case 'Reserved': return 'محجوز';
      case 'Maintenance': return 'صيانة';
      case 'Inactive': return 'غير نشط';
      default: return status;
    }
  }
}