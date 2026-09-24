import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-workspace-toolbar',
  standalone: true,
  templateUrl: './workspace-toolbar.component.html'
})
export class WorkspaceToolbarComponent {
  searchTerm = input<string>('');
  statusFilter = input<string>('all');
  statusOptions = input<{ label: string; value: string }[]>([]);
  statusCounts = input<Record<string, number>>({});

  searchChange = output<string>();
  statusChange = output<string>();
}