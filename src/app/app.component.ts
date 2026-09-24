import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
// استورد مكونات الـ Navbar والـ Sidebar الخاصة بكِ

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  isAuthPage: boolean = false;

  constructor(private router: Router) {
    // مراقبة المسار الحالي: إذا كان /login نقوم بإخفاء القوائم
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAuthPage = event.url.includes('/login');
    });
  }
}