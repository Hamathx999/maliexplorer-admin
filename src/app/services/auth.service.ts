import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
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

export interface LoginResponse {
  idUsers?: number;
  firebaseUid?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  photoUrl?: string;
  role?: string;
  message?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  public static readonly TOKEN_KEY = 'token';
  public static readonly USER_KEY = 'user';

  // Signal réactif pour l'utilisateur actuellement connecté
  readonly currentUser = signal<AuthUser | null>(this.getStoredUser());
  readonly isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());

  constructor() {
    // Si un token est présent au démarrage, charger le profil à jour
    if (this.getToken()) {
      this.refreshProfile().subscribe();
    }
  }

  /**
   * Récupère le token JWT actuellement stocké dans localStorage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(AuthService.TOKEN_KEY) ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem(AuthService.TOKEN_KEY)
    );
  }

  /**
   * Enregistre le token JWT et met à jour l'utilisateur
   */
  setToken(token: string, user?: AuthUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AuthService.TOKEN_KEY, token);
      if (user) {
        localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }
    }
  }

  /**
   * Récupère l'utilisateur stocké dans le localStorage
   */
  getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(AuthService.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Connexion avec un token JWT Firebase ID
   * Valide le token auprès de Spring Boot (POST /api/auth/login) et stocke la session
   */
  loginWithIdToken(idToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { idToken }).pipe(
      tap((res) => {
        // 1. Stocker le token dans le localStorage
        this.setToken(idToken);

        // 2. Construire et stocker l'objet utilisateur
        const user: AuthUser = {
          idUsers: res.idUsers,
          firebaseUid: res.firebaseUid,
          prenom: res.prenom,
          nom: res.nom,
          email: res.email,
          photoUrl: res.photoUrl,
          role: res.role ? String(res.role) : 'Administrateur'
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
        }
        this.currentUser.set(user);
      }),
      catchError((error) => {
        console.warn('Échec de la validation login Spring Boot :', error);
        // Si le backend renvoie une erreur ou est hors-ligne, on peut propager l'erreur
        throw error;
      })
    );
  }

  /**
   * Connexion manuelle ou avec token direct (ex: token généré ou admin test)
   */
  loginDirectToken(token: string, customUser?: Partial<AuthUser>): Observable<AuthUser> {
    const user: AuthUser = {
      idUsers: 1,
      prenom: customUser?.prenom || 'Admin',
      nom: customUser?.nom || 'MaliExplorer',
      email: customUser?.email || 'admin@maliexplorer.ml',
      role: customUser?.role || 'ADMIN',
      photoUrl: customUser?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      ...customUser
    };

    this.setToken(token, user);
    return of(user);
  }

  /**
   * Rafraîchit le profil utilisateur courant auprès du backend Spring Boot (/api/auth/me)
   */
  refreshProfile(): Observable<AuthUser | null> {
    if (!this.getToken()) {
      return of(null);
    }

    return this.http.get<AuthUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        if (user && typeof window !== 'undefined') {
          localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);
        }
      }),
      catchError(() => {
        // En cas d'erreur réseau, on conserve le profil déjà en cache local
        return of(this.getStoredUser());
      })
    );
  }

  /**
   * Déconnexion complète : supprime les tokens et redirige vers /login
   */
  logout(redirect: boolean = true): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AuthService.TOKEN_KEY);
      localStorage.removeItem('jwt');
      localStorage.removeItem('access_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem(AuthService.USER_KEY);
      sessionStorage.removeItem(AuthService.TOKEN_KEY);
    }
    this.currentUser.set(null);

    if (redirect) {
      this.router.navigate(['/login']);
    }
  }
}
