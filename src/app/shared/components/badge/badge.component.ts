// src/app/shared/components/badge/badge.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [ngClass]="[
        'font-bold rounded-md inline-flex items-center justify-center',
        variantClasses[variant],
        sizeClasses[size]
      ]"
    >
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: 'slate' | 'amber' | 'emerald' | 'rose' = 'slate';
  @Input() size: 'sm' | 'md' = 'sm';

  variantClasses = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200/80'
  };

  sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5 rounded-full'
  };
}