import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private readonly router = inject(Router);

  @Input() title: string = 'Tableau de bord';
  @Input() subtitle: string = "Bienvenue dans l'administration de MaliExplorer !";
  @Input() userName: string = 'Bonjour, admin';
  @Input() userRole: string = 'Super administrateur';

  ngOnInit(): void {
    this.updateTitleByUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateTitleByUrl(event.urlAfterRedirects);
      });
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
      this.title = 'Gestion des presidents';
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
