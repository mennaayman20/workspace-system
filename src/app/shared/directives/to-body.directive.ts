import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/** بينقل العنصر لـ <body> عشان الـ fixed overlay يتحسب على الـ viewport مش على parent فيه transform */
@Directive({ selector: '[appToBody]', standalone: true })
export class ToBodyDirective implements OnInit, OnDestroy {
  private doc = inject(DOCUMENT);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    const el = this.el.nativeElement;
    el.dir = getComputedStyle(el).direction; // نحافظ على الاتجاه (RTL/LTR) بعد النقل
    this.doc.body.appendChild(el);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.remove();
  }
}