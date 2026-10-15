import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { PermissionService } from '../../core/services/permission.service';
import { Permissions } from '../../core/constants/permissions';

interface NavItem {
  labelKey: string; // مفتاح الترجمة (بيتترجم في الـ HTML بالـ pipe)
  route: string;
  icon: string; // Material Icons
  permissions: string[]; // يكفي واحد منهم لإظهار اللينك
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
  private perms = inject(PermissionService);

  // الروابط اللي بتفضل برّه
  private allMainItems: NavItem[] = [
    { labelKey: 'SIDEBAR.ITEMS.WORKSPACES',    route: '/Workspaces',    icon: 'meeting_room', permissions: [Permissions.Workspaces.View] },
    { labelKey: 'SIDEBAR.ITEMS.LIVE_SESSIONS', route: '/live-sessions', icon: 'timer',        permissions: [Permissions.Sessions.View, Permissions.SessionProducts.View] },
    { labelKey: 'SIDEBAR.ITEMS.BOOKINGS',      route: '/bookings',      icon: 'event',        permissions: [Permissions.Bookings.View] },
  ];

  // الروابط اللي جوه الإعدادات
  private allSettingsItems: NavItem[] = [
    { labelKey: 'SIDEBAR.ITEMS.CUSTOMERS',          route: '/customers', icon: 'group',         permissions: [Permissions.Customers.View] },
    { labelKey: 'SIDEBAR.ITEMS.EMPLOYEES',          route: '/employee',  icon: 'badge',         permissions: [Permissions.Employees.View] },
    { labelKey: 'SIDEBAR.ITEMS.PRICING',            route: '/pricing',   icon: 'payments',      permissions: [Permissions.PricingPlans.View] },
    { labelKey: 'SIDEBAR.ITEMS.DISCOUNTS_PACKAGES', route: '/discounts', icon: 'percent',       permissions: [Permissions.Discounts.View, Permissions.Packages.View] },
    { labelKey: 'SIDEBAR.ITEMS.POS',                route: '/products',  icon: 'point_of_sale', permissions: [Permissions.Products.View] },
    { labelKey: 'SIDEBAR.ITEMS.SERVICES',           route: '/services',  icon: 'room_service',  permissions: [Permissions.Services.View] },
  ];

  // القوائم المفلترة حسب صلاحيات اليوزر (بتتحدث تلقائي لما الصلاحيات تتحمل)
  mainItems = computed(() => this.filterByPermission(this.allMainItems));
  settingsItems = computed(() => this.filterByPermission(this.allSettingsItems));

  // لازم تتعرف بعد allSettingsItems
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

  private filterByPermission(items: NavItem[]): NavItem[] {
    // قراءة loaded() بتخلي الـ computed يتحدث لما الصلاحيات تتحمل
    this.perms.loaded();
    return items.filter((i) => this.perms.hasAny(i.permissions));
  }

  private isSettingsRoute(url: string): boolean {
    return this.allSettingsItems.some((i) => url.startsWith(i.route));
  }

  onContactSupport() {}
}