import { Component, Input, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  @Input() title: string = 'Tableau de bord';
  @Input() subtitle: string = "Bienvenue dans l'administration de MaliExplorer !";

  // Informations utilisateur réactives issues du token / session
  readonly currentUserName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'Bonjour, Admin';
    if (user.prenom || user.nom) {
      return `${user.prenom || ''} ${user.nom || ''}`.trim();
    }
    return user.email || 'Admin';
  });

  readonly currentUserRole = computed(() => {
    const user = this.authService.currentUser();
    return user?.role ? `${user.role}` : 'Super administrateur';
  });

  readonly currentUserPhoto = computed(() => {
    const user = this.authService.currentUser();
    return user?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop';
  });

  ngOnInit(): void {
    this.updateTitleByUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateTitleByUrl(event.urlAfterRedirects);
      });
  }

  logout(): void {
    if (confirm('Voulez-vous vous déconnecter de l’administration MaliExplorer ?')) {
      this.authService.logout();
    }
  }

  private updateTitleByUrl(url: string): void {
    if (url.includes('/validation-evenement') || url.includes('/evenements/validation')) {
      this.title = 'Modération d\'Événements';
      this.subtitle = 'Espace de validation et d\'examen des contributions des promoteurs';
    } else if (url.includes('/plats')) {
      this.title = 'Gestion des plats';
      this.subtitle = "Bienvenue dans l'administration des spécialités gastronomiques !";
    } else if (url.includes('/ingredients')) {
      this.title = 'Gestion des ingrédients';
      this.subtitle = 'Gérez les ingrédients de base de la cuisine authentique malienne !';
    } else if (url.includes('/lieux-historiques/ajouter')) {
      this.title = 'Ajouter un lieu historique';
      this.subtitle = 'Enregistrer un nouveau monument ou site du patrimoine malien.';
    } else if (url.includes('/lieux-historiques')) {
      this.title = 'Gestion des lieux historiques';
      this.subtitle = 'Ajouter de nouvelles merveilles et cultures maliennes à la plateforme.';
    } else if (url.includes('/quiz')) {
      this.title = 'Gestion des quiz';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/questions')) {
      this.title = 'Gestion des questions';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/regions')) {
      this.title = 'Gestion des Régions';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/villes')) {
      this.title = 'Gestion des villes';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/evenements')) {
      this.title = 'Gestion des événements';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/ethnies')) {
      this.title = 'Gestion des ethnies';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/presidents')) {
      this.title = 'Gestion des chefs d\'État';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else if (url.includes('/utilisateurs')) {
      this.title = 'Gestion des utilisateurs';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    } else {
      this.title = 'Tableau de bord';
      this.subtitle = "Bienvenue dans l'administration de MaliExplorer !";
    }
  }
}
