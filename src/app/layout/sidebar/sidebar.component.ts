import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

interface NavItem {
  label: string;
  route: string;
  icon: string; // Material Icons
  badge?: { text: string; variant: 'slate' | 'amber' };
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    BadgeComponent,
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // الروابط اللي بتفضل برّه
  mainItems: NavItem[] = [
    { label: 'مساحات العمل', route: '/Workspaces', icon: 'meeting_room' },
    { label: 'الجلسات الحيّة', route: '/live-sessions', icon: 'timer' },
        { label: 'الحجوزات والمواعيد', route: '/bookings', icon: 'event' },

  ];

  // الروابط اللي جوه الإعدادات
  settingsItems: NavItem[] = [
    { label: 'إدارة العملاء', route: '/customers', icon: 'group' },
 { label: 'إدارة الموظفين', route: '/employee', icon: 'badge' },

    { label: 'خطط التسعير', route: '/pricing', icon: 'payments' },
    { label: 'إدارة الخصومات والباقات', route: '/discounts', icon: 'percent' },
    { label: 'POS', route: '/products', icon: 'point_of_sale' },
    { label: 'إدارة الخدمات', route: '/services', icon: 'room_service' },
  ];

  // لازم تتعرف بعد settingsItems
  settingsOpen = signal(this.isSettingsRoute(this.router.url));

  constructor() {
    // لو المستخدم راح لصفحة تابعة للإعدادات (من أي مكان) الجروب يتفتح لوحده
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (this.isSettingsRoute(e.urlAfterRedirects)) this.settingsOpen.set(true);
      });
  }

  toggleSettings() {
    this.settingsOpen.update((v) => !v);
  }

  private isSettingsRoute(url: string): boolean {
    return this.settingsItems.some((i) => url.startsWith(i.route));
  }

  onContactSupport() {}
}