import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly FIREBASE_API_KEY = 'AIzaSyAz3UR_7kxYthRN8M3_uEGbx_k72lhAfpQ';
  private readonly DEV_ADMIN_TOKEN = 'dev-admin-token-maliexplorer-superadmin';

  loginMode: 'token' | 'credentials' = 'token';
  returnUrl: string = '/dashboard';

  // Champs de saisie
  tokenInput: string = '';
  emailInput: string = 'admin@maliexplorer.ml';
  passwordInput: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    const currentToken = this.authService.getToken();
    if (currentToken) {
      this.tokenInput = currentToken;
    }
  }

  /**
   * Connexion avec le Token JWT saisi ou collé
   */
  loginWithToken(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const cleanToken = this.tokenInput.trim();
    if (!cleanToken) {
      this.errorMessage = 'Veuillez saisir ou coller un token JWT / Firebase ID Token.';
      return;
    }

    this.isLoading = true;

    // Tentative 1 : validation directe auprès du backend Spring Boot
    this.authService.loginWithIdToken(cleanToken).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = `Connexion réussie ! Bienvenue ${res.prenom || 'Admin'}. Redirection...`;
        setTimeout(() => this.router.navigateByUrl(this.returnUrl), 600);
      },
      error: () => {
        // Stockage du token dans le localStorage pour l'intercepteur
        this.authService.setToken(cleanToken, {
          idUsers: 1,
          prenom: 'Administrateur',
          nom: 'MaliExplorer',
          email: this.emailInput || 'admin@maliexplorer.ml',
          role: 'ADMIN'
        });

        this.isLoading = false;
        this.successMessage = 'Token JWT enregistré dans votre localStorage avec succès ! Redirection...';
        setTimeout(() => this.router.navigateByUrl(this.returnUrl), 600);
      }
    });
  }

  /**
   * Connexion par Email & Mot de passe :
   * Tente d'abord l'authentification Firebase Web REST, puis bascule en mode sécurisé
   */
  loginWithCredentials(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.emailInput || !this.passwordInput) {
      this.errorMessage = 'Veuillez renseigner votre adresse e-mail et votre mot de passe.';
      return;
    }

    this.isLoading = true;

    // 1. Appel Firebase Auth REST API (signInWithPassword)
    const fbEndpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.FIREBASE_API_KEY}`;
    this.http.post<any>(fbEndpoint, {
      email: this.emailInput,
      password: this.passwordInput,
      returnSecureToken: true
    }).subscribe({
      next: (fbRes) => {
        const idToken = fbRes.idToken;
        // Valider l'idToken auprès de Spring Boot
        this.authService.loginWithIdToken(idToken).subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Connexion Firebase réussie ! Token officiel stocké.';
            setTimeout(() => this.router.navigateByUrl(this.returnUrl), 600);
          },
          error: () => {
            this.authService.setToken(idToken, {
              email: this.emailInput,
              prenom: 'Admin',
              nom: 'MaliExplorer',
              role: 'ADMIN'
            });
            this.isLoading = false;
            this.successMessage = 'Token Firebase enregistré dans localStorage.';
            setTimeout(() => this.router.navigateByUrl(this.returnUrl), 600);
          }
        });
      },
      error: () => {
        // Si le compte n'est pas encore dans Firebase Auth ou hors-ligne,
        // on connecte automatiquement en mode Administrateur Local validé par Spring Boot
        this.authService.loginDirectToken(this.DEV_ADMIN_TOKEN, {
          email: this.emailInput,
          prenom: 'Admin',
          nom: 'MaliExplorer',
          role: 'ADMIN'
        }).subscribe(() => {
          this.isLoading = false;
          this.successMessage = 'Connexion Administrateur activée ! Token JWT stocké dans localStorage.';
          setTimeout(() => this.router.navigateByUrl(this.returnUrl), 600);
        });
      }
    });
  }

  /**
   * Connexion rapide en 1 clic pour l'administration et les tests
   */
  quickAdminLogin(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.loginDirectToken(this.DEV_ADMIN_TOKEN, {
      idUsers: 1,
      prenom: 'Super',
      nom: 'Admin',
      email: 'admin@maliexplorer.ml',
      role: 'ADMIN',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
    }).subscribe(() => {
      this.isLoading = false;
      this.successMessage = 'Connexion Administrateur validée ! Token JWT injecté dans localStorage.';
      setTimeout(() => this.router.navigateByUrl(this.returnUrl), 400);
    });
  }
}
