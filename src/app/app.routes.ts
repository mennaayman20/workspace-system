import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // 1. إعادة التوجيه التلقائي للمسار الرئيسي إلى صفحة تسجيل الدخول
  { 
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },

  // 2. مسار تسجيل الدخول (غير محمي)
  { 
    path: 'login', 
    component: LoginComponent 
  },

  // 3. المسارات المحمية (تستخدم Lazy Loading مع authGuard للأداء والأمان)
  {
    path: 'control-panel',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'Workspaces',
    canActivate: [authGuard],
    loadComponent: () => import('./features/workspaces/workspaces.component').then(m => m.WorkspacesComponent)
  },
//   {
//     path: 'bookings',
//    //  canActivate: [authGuard],
//     loadComponent: () => import('./features/bookings/bookings.component').then(m => m.BookingsComponent)
//   },
  {
    path: 'pos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pos/pos/pos.component').then(m => m.PosComponent)
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/payments/payments.component').then(m => m.PaymentsComponent)
  },

  // 4. حماية ضد أي مسار غير معروف (Wildcard Route)
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];