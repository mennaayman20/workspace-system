// src/app/shared/components/table/table.component.ts
import { Component, Input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-table-container">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
            <th *ngFor="let col of columns" class="p-3 border-b border-gray-200">
              {{ col.header }}
            </th>
            <th *ngIf="actionsTemplate" class="p-3 border-b border-gray-200">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading State -->
          <tr *ngIf="loading">
            <td [attr.colspan]="columns.length + (actionsTemplate ? 1 : 0)" class="text-center p-6">
              <span class="spinner"></span> جاري تحميل البيانات...
            </td>
          </tr>

          <!-- Data Rows -->
          <ng-container *ngIf="!loading && data.length > 0">
            <tr *ngFor="let row of data" class="hover:bg-gray-50 border-b border-gray-100">
              <td *ngFor="let col of columns" class="p-3">
                {{ row[col.field] }}
              </td>
              <td *ngIf="actionsTemplate" class="p-3">
                <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"></ng-container>
              </td>
            </tr>
          </ng-container>

          <!-- Empty State -->
          <tr *ngIf="!loading && data.length === 0">
            <td [attr.colspan]="columns.length + (actionsTemplate ? 1 : 0)" class="text-center p-6 text-gray-500">
              لا توجد بيانات متاحة لعرضها
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class TableComponent {
  @Input() data: any[] = [];
  @Input() columns: { field: string; header: string }[] = [];
  @Input() loading: boolean = false;
  @ContentChild('actions') actionsTemplate?: TemplateRef<any>;
}