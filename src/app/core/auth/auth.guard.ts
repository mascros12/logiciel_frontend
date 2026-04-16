import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  return auth.ensureAuthenticated().pipe(
    map((ok) => {
      if (!ok) {
        router.navigate(['/login']);
        return false;
      }
      if (!allowedRoles?.length) return true;
      const role = auth.currentUser()?.role;
      if (role && allowedRoles.includes(role)) return true;
      router.navigate(['/']);
      return false;
    }),
  );
};