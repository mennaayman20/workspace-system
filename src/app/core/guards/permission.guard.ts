import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const perms = inject(PermissionService);
  const router = inject(Router);

  const required = route.data?.['permissions'] as string[] | undefined;
  if (!required?.length) return true;

  return perms.hasAny(required) ? true : router.parseUrl('/forbidden');
};