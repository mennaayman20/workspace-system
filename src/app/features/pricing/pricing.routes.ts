import { Routes } from '@angular/router';

export const PRICING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pricing-plans/pricing-plans.component').then((m) => m.PricingPlansComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pricing-plan-details/pricing-plan-details.component').then(
        (m) => m.PricingPlanDetailsComponent,
      ),
  },
];
