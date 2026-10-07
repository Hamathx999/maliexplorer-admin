import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError, map, tap, catchError, switchMap, shareReplay, finalize } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  idUsers?: number;
  firebaseUid?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  photoUrl?: string;
  role?: string;
  adresse?: string;
}

export interface LoginResponse extends AuthUser {
  message?: string;
  token?: string;
}

/** Permet à l'intercepteur de ne PAS ajouter le header Authorization sur une requête. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

const ADMIN_ROLES = ['admin', 'superadmin'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly firebaseKey = environment.firebase.apiKey;

  static readonly TOKEN_KEY = 'token';
  static readonly USER_KEY = 'user';
  static readonly REFRESH_KEY = 'firebase_refresh_token';
  static readonly EXPIRES_KEY = 'token_expires_at';

  private readonly token = signal<string | null>(this.read(AuthService.TOKEN_KEY));
  readonly currentUser = signal<AuthUser | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());

  private refresh$: Observable<string> | null = null;

  // ───────────────────────── Stockage ─────────────────────────

  private get browser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private read(key: string): string | null {
    return this.browser ? localStorage.getItem(key) : null;
  }

  private readUser(): AuthUser | null {
    try {
      const raw = this.read(AuthService.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token();
  }

  getStoredUser(): AuthUser | null {
    return this.currentUser();
  }

  setToken(token: string, user?: AuthUser, expiresInSec?: number): void {
    if (this.browser) {
      localStorage.setItem(AuthService.TOKEN_KEY, token);
      if (expiresInSec) {
        localStorage.setItem(AuthService.EXPIRES_KEY, String(Date.now() + expiresInSec * 1000));
      }
      if (user) localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    }
    this.token.set(token);
    if (user) this.currentUser.set(user);
  }

  /** Vrai si le token Firebase expire dans moins d'une minute. */
  isTokenExpiringSoon(): boolean {
    const exp = Number(this.read(AuthService.EXPIRES_KEY) || 0);
    return !!exp && Date.now() > exp - 60_000;
  }

  hasRefreshToken(): boolean {
    return !!this.read(AuthService.REFRESH_KEY);
  }

  // ───────────────────────── Connexion ─────────────────────────

  /**
   * 1. Firebase (email / mot de passe) → idToken
   * 2. Spring Boot POST /api/auth/login { idToken } → profil
   * 3. Vérification du rôle admin / superAdmin
   * 4. Sauvegarde dans le localStorage
   */
  loginWithFirebase(email: string, password: string): Observable<LoginResponse> {
    this.clearSession(); // on repart d'une session propre

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.firebaseKey}`;
    return this.http
      .post<any>(url, { email, password, returnSecureToken: true }, { context: this.noAuth() })
      .pipe(
        switchMap((fb) => {
          if (this.browser && fb.refreshToken) {
            localStorage.setItem(AuthService.REFRESH_KEY, fb.refreshToken);
          }
          return this.loginWithIdToken(fb.idToken, Number(fb.expiresIn) || 3600);
        })
      );
  }

  /** Valide un idToken Firebase auprès de Spring Boot et ouvre la session. */
  loginWithIdToken(idToken: string, expiresInSec = 3600): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { idToken }, { context: this.noAuth() })
      .pipe(
        switchMap((res) => {
          const role = String(res.role || '').toLowerCase();
          if (!ADMIN_ROLES.includes(role)) {
            this.clearSession();
            return throwError(() => ({
              status: 403,
              error: { message: `Accès refusé : le compte ${res.email} n'a pas le rôle administrateur.` }
            }));
          }
          const user: AuthUser = {
            idUsers: res.idUsers,
            firebaseUid: res.firebaseUid,
            prenom: res.prenom,
            nom: res.nom,
            email: res.email,
            photoUrl: res.photoUrl,
            adresse: res.adresse,
            role: res.role
          };
          this.setToken(res.token || idToken, user, expiresInSec);
          return of(res);
        })
      );
  }

  /** Token de développement reconnu par FirebaseAuthenticationFilter (Spring Boot). */
  loginWithDevToken(): Observable<AuthUser> {
    this.clearSession();
    const devToken = 'dev-admin-token-maliexplorer-superadmin';
    this.token.set(devToken);
    if (this.browser) localStorage.setItem(AuthService.TOKEN_KEY, devToken);

    return this.http.get<AuthUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => this.setToken(devToken, user)),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  // ───────────────────────── Refresh ─────────────────────────

  /** Échange le refresh token Firebase contre un nouvel idToken (un seul appel partagé). */
  refreshIdToken(): Observable<string> {
    const refreshToken = this.read(AuthService.REFRESH_KEY);
    if (!refreshToken) return throwError(() => new Error('Aucun refresh token'));

    if (!this.refresh$) {
      const url = `https://securetoken.googleapis.com/v1/token?key=${this.firebaseKey}`;
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString();

      this.refresh$ = this.http
        .post<any>(url, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          context: this.noAuth()
        })
        .pipe(
          map((res) => {
            if (this.browser && res.refresh_token) {
              localStorage.setItem(AuthService.REFRESH_KEY, res.refresh_token);
            }
            this.setToken(res.id_token, undefined, Number(res.expires_in) || 3600);
            return res.id_token as string;
          }),
          finalize(() => (this.refresh$ = null)),
          shareReplay(1)
        );
    }
    return this.refresh$;
  }

  refreshProfile(): Observable<AuthUser | null> {
    if (!this.getToken()) return of(null);
    return this.http.get<AuthUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        if (user && this.browser) localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
      catchError(() => of(this.currentUser()))
    );
  }

  // ───────────────────────── Déconnexion ─────────────────────────

  private clearSession(): void {
    if (this.browser) {
      [AuthService.TOKEN_KEY, AuthService.USER_KEY, AuthService.REFRESH_KEY, AuthService.EXPIRES_KEY,
        'jwt', 'access_token', 'authToken'].forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem(AuthService.TOKEN_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
  }

  logout(redirect = true): void {
    this.clearSession();
    if (redirect) this.router.navigate(['/login']);
  }

  // ───────────────────────── Utilitaires ─────────────────────────

  private noAuth(): HttpContext {
    return new HttpContext().set(SKIP_AUTH, true);
  }

  /** Traduit une erreur Firebase / Spring Boot en message lisible. */
  static errorMessage(err: HttpErrorResponse | any): string {
    const fb = err?.error?.error?.message as string | undefined;
    if (fb) {
      if (fb.startsWith('INVALID_LOGIN_CREDENTIALS') || fb === 'INVALID_PASSWORD' || fb === 'EMAIL_NOT_FOUND') {
        return 'Email ou mot de passe incorrect.';
      }
      if (fb === 'USER_DISABLED') return 'Ce compte a été désactivé.';
      if (fb.startsWith('TOO_MANY_ATTEMPTS_TRY_LATER')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
      if (fb === 'INVALID_EMAIL') return 'Adresse e-mail invalide.';
      if (fb === 'MISSING_PASSWORD') return 'Veuillez saisir votre mot de passe.';
      return `Erreur Firebase : ${fb}`;
    }
    if (err?.status === 0) return 'Serveur injoignable. Vérifiez que Spring Boot tourne sur le port 8080.';
    if (err?.error?.message) return err.error.message;
    return 'Connexion impossible. Réessayez.';
  }
}