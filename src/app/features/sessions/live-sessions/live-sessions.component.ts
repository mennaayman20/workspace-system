import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play, Plus, MoveRight, Square, Clock } from 'lucide-angular';
import { SessionsService } from '../sessions.service';
import { ActiveSessionDto } from '../Isessions';
import { StartSessionModalComponent } from '../start-session-modal/start-session-modal.component';

@Component({
  selector: 'app-live-sessions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, StartSessionModalComponent],
  templateUrl: './live-sessions.component.html'
})
export class LiveSessionsComponent implements OnInit, OnDestroy {
  private sessionsService = inject(SessionsService);

  readonly PlayIcon = Play;
  readonly PlusIcon = Plus;
  readonly MoveIcon = MoveRight;
  readonly StopIcon = Square;
  readonly ClockIcon = Clock;

  activeSessions = signal<ActiveSessionDto[]>([]);
  isLoading = signal<boolean>(true);
  isStartModalOpen = signal<boolean>(false);

  private timerInterval: any;

  ngOnInit() {
    this.loadActiveSessions();
    // تحديث العداد الحي كل ثانية
   this.timerInterval = setInterval(() => {
    this.activeSessions.update(sessions => Array.isArray(sessions) ? [...sessions] : []);
  }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

loadActiveSessions() {
  this.isLoading.set(true);
  this.sessionsService.getActiveSessions().subscribe({
    next: (res: any) => {
      // التعامل مع البيانات سواء كانت مصفوفة مباشرة أو داخل Object كـ data/items
      const sessionsArray = Array.isArray(res) 
        ? res 
        : (res?.data?.items || res?.data || res?.items || []);

      this.activeSessions.set(sessionsArray);
      this.isLoading.set(false);
    },
    error: (err) => {
      console.error('Error loading active sessions:', err);
      this.activeSessions.set([]); // تعيين مصفوفة فارغة لتجنب الكراش
      this.isLoading.set(false);
    }
  });
}
  // حساب الوقت المنقضي Real-Time
  getElapsedTime(startTime: string): string {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, Math.floor((now - start) / 1000));

    const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  // إنهاء الجلسة
  onEndSession(sessionId: number) {
    if (confirm('هل أنت تأكد من إنهاء هذه الجلسة وتجهيز الحساب؟')) {
      this.sessionsService.endSession(sessionId).subscribe({
        next: () => this.loadActiveSessions()
      });
    }
  }

  // تغيير المكان (Change Workspace)
  onChangeWorkspace(sessionId: number) {
    const newWorkspaceId = prompt('أدخل رقم الـ Workspace الجديد:');
    if (newWorkspaceId) {
      this.sessionsService.changeWorkspace(sessionId, {
        sessionId,
        newWorkspaceId: Number(newWorkspaceId)
      }).subscribe({
        next: () => this.loadActiveSessions()
      });
    }
  }
}