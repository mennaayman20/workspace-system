import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

interface NavItem {
  labelKey: string; // مفتاح الترجمة (بيتترجم في الـ HTML بالـ pipe)
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
    TranslatePipe,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // الروابط اللي بتفضل برّه
  mainItems: NavItem[] = [
    { labelKey: 'SIDEBAR.ITEMS.WORKSPACES',    route: '/Workspaces',    icon: 'meeting_room' },
    { labelKey: 'SIDEBAR.ITEMS.LIVE_SESSIONS', route: '/live-sessions', icon: 'timer' },
    { labelKey: 'SIDEBAR.ITEMS.BOOKINGS',      route: '/bookings',      icon: 'event' },
  ];

  // الروابط اللي جوه الإعدادات
  settingsItems: NavItem[] = [
    { labelKey: 'SIDEBAR.ITEMS.CUSTOMERS',          route: '/customers', icon: 'group' },
    { labelKey: 'SIDEBAR.ITEMS.EMPLOYEES',          route: '/employee',  icon: 'badge' },
    { labelKey: 'SIDEBAR.ITEMS.PRICING',            route: '/pricing',   icon: 'payments' },
    { labelKey: 'SIDEBAR.ITEMS.DISCOUNTS_PACKAGES', route: '/discounts', icon: 'percent' },
    { labelKey: 'SIDEBAR.ITEMS.POS',                route: '/products',  icon: 'point_of_sale' },
    { labelKey: 'SIDEBAR.ITEMS.SERVICES',           route: '/services',  icon: 'room_service' },
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