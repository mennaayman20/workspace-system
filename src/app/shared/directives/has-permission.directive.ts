import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

@Directive({ selector: '[hasPermission]', standalone: true })
export class HasPermissionDirective {
  private perms = inject(PermissionService);
  private tpl = inject(TemplateRef<any>);
  private vcr = inject(ViewContainerRef);
  private required: string[] = [];

  @Input() set hasPermission(value: string | string[]) {
    this.required = Array.isArray(value) ? value : [value];
    this.update();
  }

  constructor() {
    effect(() => {
      this.perms.loaded();
      this.update();
    });
  }

  private update() {
    this.vcr.clear();
    if (this.perms.hasAny(this.required)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}