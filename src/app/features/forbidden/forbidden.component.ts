import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div style="text-align:center;margin-top:80px">
      <h2>ليس لديك صلاحية للوصول لهذه الصفحة</h2>
      <a routerLink="/live-sessions">الرجوع للرئيسية</a>
    </div>
  `,
})
export class ForbiddenComponent {}