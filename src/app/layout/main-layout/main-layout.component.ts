import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="h-screen flex flex-col">
      <!-- الناف بار العلوية -->
      <app-navbar></app-navbar>

      <!-- السايد بار والمحتوى الرئيسي -->
      <div class="flex-1 flex overflow-hidden">
        <app-sidebar></app-sidebar>
        <main class="flex-1 overflow-y-auto p-6 bg-slate-50">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {}