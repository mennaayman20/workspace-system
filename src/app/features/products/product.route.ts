// src/app/features/products/products.routes.ts
import { Routes } from '@angular/router';

export const PRODUCT_ROUTES: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { 
    path: 'list', 
    loadComponent: () => import('./pages/product-list/product-list.component').then(m => m.ProductListComponent) 
  },
  { 
    path: 'categories', 
    loadComponent: () => import('./pages/category-list/category-list.component').then(m => m.CategoryListComponent) 
  }
];