import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Récupération du token JWT stocké dans le localStorage via AuthService
  const token = authService.getToken();

  let authReq = req;

  // 2. Injection automatique du token Bearer dans l'en-tête Authorization
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn('Spring Boot [401 Non autorisé] : Token JWT manquant, expiré ou invalide.');
        // Si la session a expiré lors d'un appel à l'API, rediriger vers login
        if (typeof window !== 'undefined' && !req.url.includes('/api/auth/login')) {
          authService.logout(false);
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      } else if (error.status === 403) {
        console.warn('Spring Boot [403 Accès refusé] : Privilèges ROLE_ADMIN requis.');
      }
      return throwError(() => error);
    })
  );
};
