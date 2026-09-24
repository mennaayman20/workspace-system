import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-workspace-table',
  standalone: true,
  templateUrl: './workspace-table.component.html'
})
export class WorkspaceTableComponent {
  workspaces = input<any[]>([]);
  statusOptions = input<{ label: string; value: string }[]>([]);
  isBusy = input<(id: any) => boolean>(() => false);
  getStatusBadgeClass = input<(status: string) => string>(() => '');
  statusLabel = input<(status: string) => string>(() => '');

  statusChange = output<{ workspace: any; status: string }>();
  edit = output<any>();
  delete = output<any>();
}