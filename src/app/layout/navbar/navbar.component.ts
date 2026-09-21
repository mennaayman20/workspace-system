import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// استيراد الـ Shared Reusable Components
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
    ButtonComponent, 
    InputComponent, 
    BadgeComponent, 
    ModalComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  activeSessionsCount = signal<number>(12);
  unreadNotifications = signal<number>(3);
  searchQuery = signal<string>('');
  isCheckInModalOpen = signal<boolean>(false);

  currentUser = signal({
    name: 'مي احمد',
    role: 'الاستقبال (Admin)',
    initials: 'م'
  });

  currentLang = signal<'EN' | 'AR'>('EN');

  onSearch(value: any) {
    this.searchQuery.set(value);
  }

  toggleLanguage() {
    this.currentLang.update(lang => lang === 'EN' ? 'AR' : 'EN');
  }

  openCheckInModal() {
    this.isCheckInModalOpen.set(true);
  }

  closeCheckInModal() {
    this.isCheckInModalOpen.set(false);
  }
}