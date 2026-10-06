import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isItemActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    if (item.route === '/evenements' && (currentUrl.includes('/evenements') || currentUrl.includes('/validation-evenement'))) {
      return true;
    }
    return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
  }

  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/dashboard', icon: 'dashboard' },
    { label: 'Événements', route: '/evenements', icon: 'calendar' },
    { label: 'Les régions', route: '/regions', icon: 'map' },
    { label: 'Les villes', route: '/villes', icon: 'building' },
    { label: 'Lieux historiques', route: '/lieux-historiques', icon: 'landmark' },
    { label: 'Les ethnies', route: '/ethnies', icon: 'users' },
    { label: 'Les plats', route: '/plats', icon: 'utensils' },
    { label: 'Les ingredients', route: '/ingredients', icon: 'carrot' },
    { label: 'Les quiz', route: '/quiz', icon: 'help-circle' },
    { label: 'Les questions', route: '/questions', icon: 'lightbulb' },
    { label: 'Les presidents', route: '/presidents', icon: 'award' },
    { label: 'Utilisateurs', route: '/utilisateurs', icon: 'user' },
  ];

  logout(): void {
    if (confirm('Voulez-vous vous déconnecter de l’administration MaliExplorer ?')) {
      this.authService.logout();
    }
  }
}
