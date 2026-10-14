import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { Permissions } from './core/constants/permissions';

export const routes: Routes = [
  // 1. تسجيل الدخول (بدون Navbar ولا Sidebar)
  {
    path: 'login',
    component: LoginComponent,
  },

  // 2. المسارات المحمية داخل الـ MainLayout
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'customers', pathMatch: 'full' },

      {
        path: 'live-sessions',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Sessions.View, Permissions.SessionProducts.View] },
        loadComponent: () =>
          import('./features/sessions/live-sessions/live-sessions.component').then(
            (m) => m.LiveSessionsComponent
          ),
      },
      {
        path: 'Workspaces',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Workspaces.View] },
        loadComponent: () =>
          import('./features/workspaces/workspaces.component').then((m) => m.WorkspacesComponent),
      },
      {
        path: 'bookings',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Bookings.View] },
        loadComponent: () =>
          import('./features/booking/booking/booking.component').then((m) => m.BookingComponent),
      },
      {
        path: 'products',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Products.View] },
        loadChildren: () =>
          import('./features/products/product.route').then((m) => m.PRODUCT_ROUTES),
      },
      {
        path: 'services',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Services.View] },
        loadComponent: () =>
          import('./features/services/service-list/service-list.component').then(
            (m) => m.ServiceListComponent
          ),
      },
      {
        path: 'discounts',
        canActivate: [permissionGuard],
        // الصفحة دي فيها خصومات وباقات، فيكفي أحدهم
        data: { permissions: [Permissions.Discounts.View, Permissions.Packages.View] },
        loadComponent: () =>
          import('./features/discount/discount.component').then((m) => m.DiscountsComponent),
      },
      {
        path: 'packages',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Packages.View] },
        loadComponent: () =>
          import('./features/packages/packages.component').then((m) => m.PackagesComponent),
      },
      {
        path: 'employee',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Employees.View] },
        loadComponent: () =>
          import('./features/employee/employee.component').then((m) => m.EmployeeComponent),
      },
      {
        path: 'customers',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Customers.View] },
        loadComponent: () =>
          import('./features/customers/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'company',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.Companies.View] },
        loadComponent: () =>
          import('./features/company/company.component').then((m) => m.CompanyComponent),
      },
      {
        path: 'pricing',
        canActivate: [permissionGuard],
        data: { permissions: [Permissions.PricingPlans.View] },
        loadChildren: () =>
          import('./features/pricing/pricing.routes').then((m) => m.PRICING_ROUTES),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/payments/payments/payments.component').then(
            (m) => m.PaymentsComponent
          ),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },

  // 3. أي مسار غير معروف
  {
    path: '**',
    redirectTo: 'login',
  },
];