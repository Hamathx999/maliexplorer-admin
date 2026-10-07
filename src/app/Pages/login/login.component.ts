import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginMode: 'token' | 'credentials' = 'credentials';
  returnUrl = '/dashboard';

  tokenInput = '';
  emailInput = '';
  passwordInput = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  /** Email + mot de passe → Firebase → Spring Boot */
  loginWithCredentials(): void {
    const email = this.emailInput.trim();
    const password = this.passwordInput;

    if (!email || !password) {
      this.errorMessage = 'Veuillez renseigner votre adresse e-mail et votre mot de passe.';
      return;
    }
    this.run(this.authService.loginWithFirebase(email, password));
  }

  /** Firebase ID Token collé manuellement → Spring Boot */
  loginWithToken(): void {
    const token = this.tokenInput.trim();
    if (!token) {
      this.errorMessage = 'Veuillez coller un Firebase ID Token.';
      return;
    }
    this.run(
      token.startsWith('dev-admin')
        ? this.authService.loginWithDevToken()
        : this.authService.loginWithIdToken(token)
    );
  }

  /** Token de développement reconnu par le backend (compte superAdmin en base) */
  quickDevAdminLogin(): void {
    this.run(this.authService.loginWithDevToken());
  }

  private run(login$: Observable<{ prenom?: string }>): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    login$.subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = `Bienvenue ${user?.prenom || ''} ! Redirection...`;
        setTimeout(() => this.router.navigateByUrl(this.returnUrl), 400);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Échec de connexion :', err);
        this.errorMessage = AuthService.errorMessage(err);
      }
    });
  }
}
