import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // 1. مسار تسجيل الدخول (مستقل تماماً بدون Navbar ولا Sidebar)
  { 
    path: 'login', 
    component: LoginComponent 
  },

  // 2. جميع المسارات المحمية تقع داخل الـ MainLayoutComponent
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard], // حماية كل الصفحات التي بداخل المخطط مرة واحدة
    children: [
      { 
        path: 'control-panel', 
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { 
        path: 'Workspaces', 
        loadComponent: () => import('./features/workspaces/workspaces.component').then(m => m.WorkspacesComponent)
      },
      { 
        path: 'customers', 
        loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent)
      },
      { 
        path: 'pos', 
        loadComponent: () => import('./features/pos/pos/pos.component').then(m => m.PosComponent)
      },
      { 
        path: 'payments', 
        loadComponent: () => import('./features/payments/payments/payments.component').then(m => m.PaymentsComponent)
      },
      { 
        path: '', 
        redirectTo: 'control-panel', 
        pathMatch: 'full' 
      }
    ]
  },

  // 3. أي مسار غير معروف يُعيد التوجيه إلى تسجيل الدخول
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];