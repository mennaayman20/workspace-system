import { Directive, TemplateRef, inject, input } from '@angular/core';

/** <ng-template appCell="name" let-row> ... يستبدل محتوى خلية عمود معيّن */
@Directive({ selector: 'ng-template[appCell]', standalone: true })
export class CellTemplateDirective {
  readonly key = input.required<string>({ alias: 'appCell' });
  readonly template = inject(TemplateRef);
}

/** <ng-template appRowActions let-row> ... أزرار إضافية قبل أزرار الـ actions */
@Directive({ selector: 'ng-template[appRowActions]', standalone: true })
export class RowActionsDirective {
  readonly template = inject(TemplateRef);
}