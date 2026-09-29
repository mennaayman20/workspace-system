import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
// import { LanguageService } from '../../core/services/lang.service';
// استيراد وحدات Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
// import { TranslatePipe } from '@ngx-translate/core';
// استيراد الـ Shared Components الخاصة بك
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface NavItem {
  label: string;
  route: string;
  icon: string; // أسماء Material Icons (مثل: 'dashboard', 'meeting_room')
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
  
    // إضافة وحدات الماتريال للـ imports
    MatIconModule,
    MatRippleModule,
    MatButtonModule,

 ],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  // public langService = inject(LanguageService);
  navItems: NavItem[] = [
    { label: 'لوحة التحكّم', route: 'control-panel', icon: 'dashboard' },
    { label: 'مساحات العمل', route: 'Workspaces', icon: 'meeting_room' },
    { label: 'دخول عميل', route: 'customers', icon: 'person_add' },
    { label: 'التسعير', route: '/pricing', icon: 'payments' },
    { label: 'المشروبات والـ POS', route: 'pos', icon: 'local_cafe' },
    { label: 'الخزينة والتقارير', route: 'payments', icon: 'account_balance_wallet' },
  ];

  onContactSupport() {
    // توجيه لخدمة الدعم الفني
  }
}