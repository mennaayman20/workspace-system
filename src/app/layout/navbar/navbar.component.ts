import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../core/services/lang.service';

import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // TranslatePipe,
    ButtonComponent,
    InputComponent,
    BadgeComponent,
    ModalComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  // private langService = inject(LanguageService);

  activeSessionsCount = signal<number>(12);
  unreadNotifications = signal<number>(3);
  searchQuery = signal<string>('');

  isCheckInModalOpen = signal<boolean>(false);
  checkInPhone = signal<string>('');
  checkInSpace = signal<string>('');

  currentUser = signal({
    name: 'مي احمد',
    role: 'الاستقبال (Admin)',
    initials: 'م',
  });

  // بيعرض اللغة اللي هيتحول ليها الزرار، ومربوط مباشرة بالـ service
  // currentLang = computed<'EN' | 'AR'>(() =>
  //   this.langService.currentLang() === 'ar' ? 'EN' : 'AR'
  // );

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  // toggleLanguage(): void {
  //   this.langService.toggleLanguage();
  // }

  openCheckInModal(): void {
    this.isCheckInModalOpen.set(true);
  }

  closeCheckInModal(): void {
    this.isCheckInModalOpen.set(false);
  }

  confirmCheckIn(): void {
    // TODO: ابعتي البيانات للـ API هنا
    console.log('Check-in:', this.checkInPhone(), this.checkInSpace());
    this.checkInPhone.set('');
    this.checkInSpace.set('');
    this.closeCheckInModal();
  }
}