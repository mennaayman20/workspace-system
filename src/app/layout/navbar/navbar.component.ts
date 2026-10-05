import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { SessionsService } from '../../features/sessions/sessions.service';
import { ActiveSessionDto } from '../../features/sessions/Isessions';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    ModalComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  private sessionsService = inject(SessionsService);

  activeSessions = signal<ActiveSessionDto[]>([]);
  isLoading = signal<boolean>(true);

  searchQuery = signal<string>('');

  isCheckInModalOpen = signal<boolean>(false);
  checkInPhone = signal<string>('');
  checkInSpace = signal<string>('');

  // حساب عدد الجلسات بنفس طريقة الكومبوننت الآخر
  sessionsCount = computed(() => this.activeSessions().length);

  currentUser = signal({
    name: 'مي احمد',
    role: 'الاستقبال (Admin)',
    initials: 'م',
  });

  ngOnInit(): void {
    this.loadActiveSessions();
  }

  loadActiveSessions(): void {
    this.isLoading.set(true);
    this.sessionsService.getActiveSessions().subscribe({
      next: (res: any) => {
        // ✅ نفس طريقة استخراج البيانات المستخدمة في live-sessions.component.ts
        const list = Array.isArray(res)
          ? res
          : res?.data?.items || res?.data || res?.items || [];

        this.activeSessions.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading active sessions:', err);
        this.activeSessions.set([]);
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  openCheckInModal(): void {
    this.isCheckInModalOpen.set(true);
  }

  closeCheckInModal(): void {
    this.isCheckInModalOpen.set(false);
  }

  confirmCheckIn(): void {
    console.log('Check-in:', this.checkInPhone(), this.checkInSpace());
    this.checkInPhone.set('');
    this.checkInSpace.set('');
    this.closeCheckInModal();
  }
}