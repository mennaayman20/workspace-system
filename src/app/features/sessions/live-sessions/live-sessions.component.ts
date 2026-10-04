import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule, Play, Plus, MoveLeft, Square, Clock } from 'lucide-angular';
import { SessionsService } from '../sessions.service';
import { ActiveSessionDto } from '../Isessions';
import { StartSessionModalComponent } from '../start-session-modal/start-session-modal.component';

type PendingAction =
  | { type: 'end'; sessionId: number }
  | { type: 'move'; sessionId: number }
  | null;

@Component({
  selector: 'app-live-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, LucideAngularModule, StartSessionModalComponent],
  templateUrl: './live-sessions.component.html'
})
export class LiveSessionsComponent implements OnInit, OnDestroy {
  private sessionsService = inject(SessionsService);
  private snackBar = inject(MatSnackBar);

  readonly PlayIcon = Play;
  readonly PlusIcon = Plus;
  readonly MoveIcon = MoveLeft;
  readonly StopIcon = Square;
  readonly ClockIcon = Clock;

  activeSessions = signal<ActiveSessionDto[]>([]);
  isLoading = signal(true);
  isStartModalOpen = signal(false);

  // التايمر: signal واحد بيتحدث كل ثانية
  now = signal(Date.now());
  private timerInterval?: ReturnType<typeof setInterval>;

  // الأكشن المعلّق (تأكيد إنهاء / نقل)
  pending = signal<PendingAction>(null);
  newWorkspaceId = '';
  busyId = signal<number | null>(null);

  sessionsCount = computed(() => this.activeSessions().length);

  ngOnInit() {
    this.loadActiveSessions();
    this.timerInterval = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadActiveSessions() {
    this.isLoading.set(true);
    this.sessionsService.getActiveSessions().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
        this.activeSessions.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading active sessions:', err);
        this.activeSessions.set([]);
        this.isLoading.set(false);
        this.notify('تعذر تحميل الجلسات النشطة', true);
      }
    });
  }

  // ✅ حل مشكلة الـ 3 ساعات: لو السيرفر بعت UTC من غير Z نضيفها
  private parseServerDate(value: string): number {
    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
    return new Date(hasTimezone ? value : value + 'Z').getTime();
  }

  getElapsedTime(startTime: string): string {
    const diff = Math.max(0, Math.floor((this.now() - this.parseServerDate(startTime)) / 1000));
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ===== إنهاء الجلسة =====
  askEnd(sessionId: number) {
    this.pending.set({ type: 'end', sessionId });
  }

  confirmEnd(sessionId: number) {
    this.busyId.set(sessionId);
    this.sessionsService.endSession(sessionId).subscribe({
      next: () => {
        this.closePending();
        this.busyId.set(null);
        this.notify('تم إنهاء الجلسة بنجاح');
        this.loadActiveSessions();
      },
      error: () => {
        this.busyId.set(null);
        this.notify('فشل إنهاء الجلسة', true);
      }
    });
  }

  // ===== نقل المكان =====
  askMove(sessionId: number) {
    this.newWorkspaceId = '';
    this.pending.set({ type: 'move', sessionId });
  }

  confirmMove(sessionId: number) {
    const id = Number(this.newWorkspaceId);
    if (!id || id <= 0) {
      this.notify('أدخل رقم Workspace صحيح', true);
      return;
    }
    this.busyId.set(sessionId);
    this.sessionsService.changeWorkspace(sessionId, { sessionId, newWorkspaceId: id }).subscribe({
      next: () => {
        this.closePending();
        this.busyId.set(null);
        this.notify('تم نقل الجلسة');
        this.loadActiveSessions();
      },
      error: () => {
        this.busyId.set(null);
        this.notify('فشل نقل الجلسة', true);
      }
    });
  }

  closePending() {
    this.pending.set(null);
  }

  private notify(message: string, isError = false) {
    this.snackBar.open(message, 'إغلاق', {
      duration: 3000,
      panelClass: isError ? ['bg-red-600', 'text-white'] : ['bg-emerald-600', 'text-white']
    });
  }
}