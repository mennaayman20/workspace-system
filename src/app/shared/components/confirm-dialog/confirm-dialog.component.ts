import { ChangeDetectionStrategy, Component, HostListener, computed, inject, input, output } from '@angular/core';
import { LucideAngularModule, Trash2 } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/lang.service';
import { PortalDirective } from '../../directives/portal.directive';

export type ConfirmTone = 'danger' | 'warning' | 'primary';

const TONES: Record<ConfirmTone, { icon: string; button: string }> = {
  danger:  { icon: 'bg-red-50 text-red-500', button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: 'bg-amber-50 text-amber-500', button: 'bg-amber-500 hover:bg-amber-600' },
  primary: { icon: 'bg-blue-50 text-blue-500', button: 'bg-blue-600 hover:bg-blue-700' },
};

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly open = input.required<boolean>();
readonly langService = inject(LanguageService);
  readonly title = input('CONFIRM_DIALOG.DEFAULT_TITLE');
  readonly message = input('CONFIRM_DIALOG.DEFAULT_MESSAGE');
  readonly itemName = input('');
  readonly description = input<string | null>(null);

  readonly confirmLabel = input('CONFIRM_DIALOG.CONFIRM_DELETE');
  readonly loadingLabel = input('CONFIRM_DIALOG.DELETING');
  readonly cancelLabel = input('CONFIRM_DIALOG.CANCEL');

  readonly loading = input(false);
  readonly tone = input<ConfirmTone>('danger');
  readonly icon = input<any>(Trash2);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly toneClasses = computed(() => TONES[this.tone()]);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onCancel();
  }

  onCancel(): void {
    if (!this.open() || this.loading()) return;
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (this.loading()) return;
    this.confirmed.emit();
  }
}