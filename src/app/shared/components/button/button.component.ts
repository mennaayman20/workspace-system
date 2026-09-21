// src/app/shared/components/button/button.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick.emit($event)"
      [ngClass]="[
        'inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 rounded-xl cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : ''
      ]"
    >
      <span *ngIf="loading" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Output() onClick = new EventEmitter<Event>();

  variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm',
    secondary: 'bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-600 hover:text-white',
    outline: 'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm'
  };

  sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm'
  };
}