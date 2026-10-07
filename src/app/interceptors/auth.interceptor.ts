import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService, SKIP_AUTH } from '../services/auth.service';
import { environment } from '../../environments/environment';

const withBearer = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // On n'ajoute le token QUE pour notre backend Spring Boot.
  // L'ajouter sur les appels Firebase (identitytoolkit / securetoken) provoque un 400/401.
  const isApiCall = req.url.startsWith(environment.apiUrl);
  if (!isApiCall || req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const expireSession = (error: unknown) => {
    auth.logout(false);
    router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    return throwError(() => error);
  };

  const send = (token: string | null) =>
    next(token ? withBearer(req, token) : req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) return throwError(() => error);

        // 401 : on tente une seule fois de rafraîchir le token Firebase
        if (auth.hasRefreshToken()) {
          return auth.refreshIdToken().pipe(
            switchMap((fresh) => next(withBearer(req, fresh))),
            catchError(expireSession)
          );
        }
        return expireSession(error);
      })
    );

  // Token Firebase sur le point d'expirer → refresh préventif
  if (auth.getToken() && auth.isTokenExpiringSoon() && auth.hasRefreshToken()) {
    return auth.refreshIdToken().pipe(
      switchMap((fresh) => send(fresh)),
      catchError(expireSession)
    );
  }

  return send(auth.getToken());
};
