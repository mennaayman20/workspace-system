import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, X, Check, MapPin, Users } from 'lucide-angular';

import { SessionsService } from '../sessions.service';
import { WorkspaceService } from '../../../core/services/workspace.service'; // عدّل المسار لو مختلف
import { Workspace } from '../../../core/interfaces/Iworkspace';
import { LanguageService } from '../../../core/services/lang.service'; // عدّل المسار لو مختلف

@Component({
  selector: 'app-transfer-workspace-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './transfer-session-modal.component.html',
})
export class TransferWorkspaceModalComponent implements OnInit {
  private sessionsService = inject(SessionsService);
  private workspaceService = inject(WorkspaceService);
  private lang = inject(LanguageService);

  // Inputs
  sessionId = input.required<number>();
  currentWorkspaceId = input.required<number>();
  currentWorkspaceName = input<string>('');

  // Outputs
  closeModal = output<void>();
  transferred = output<void>();

  readonly CloseIcon = X;
  readonly CheckIcon = Check;
  readonly PinIcon = MapPin;
  readonly UsersIcon = Users;

  workspaces = signal<Workspace[]>([]);
  selectedId = signal<number | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  canSubmit = computed(() => this.selectedId() !== null && !this.isSubmitting());

  ngOnInit() {
    // forceReload عشان الحالة (Available/Occupied) تكون محدّثة
    this.workspaceService.getWorkspaces(true).subscribe({
      next: (list) => {
        this.workspaces.set(
          list.filter(
            (w) => w.id !== this.currentWorkspaceId() && w.status === 'Available' && !w.isDeleted
          )
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.lang.t('SESSIONS.TRANSFER.ERR_LOAD'));
        this.isLoading.set(false);
      },
    });
  }

  select(id: number) {
    this.selectedId.set(id);
    this.errorMessage.set(null);
  }

  confirm() {
    const newWorkspaceId = this.selectedId();
    if (newWorkspaceId === null) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.sessionsService
      .changeWorkspace(this.sessionId(), { sessionId: this.sessionId(), newWorkspaceId })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.transferred.emit();
          this.closeModal.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || this.lang.t('SESSIONS.TRANSFER.ERR_TRANSFER'));
        },
      });
  }
}