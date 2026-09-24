import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
// استيراد الـ Shared Components
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: {
    text: string;
    variant: 'slate' | 'amber';
  };
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive, 
    BadgeComponent, 
    ButtonComponent
  ],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'لوحة التحكّم', route: 'control-panel', icon: '📊' },
    { label: 'مساحات العمل', route: 'Workspaces', icon: '🚪' },

    { label: 'الحجوزات والاشتراكات', route: 'bookings', icon: '📅' },

    { label: 'المشروبات والـ POS', route: 'pos', icon: '☕' },
    { label: 'الخزينة والتقارير', route: 'payments', icon: '💳' },
  ];

  onContactSupport() {
    // توجيه لخدمة الدعم الفني
  }
}