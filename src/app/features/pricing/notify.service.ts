import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** إشعار بسيط (Toast). لو عندك Toast service في الـ design system استبدليه بيه. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  show(message: string, action = 'حسناً'): void {
    this.snackBar.open(message, action, {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
