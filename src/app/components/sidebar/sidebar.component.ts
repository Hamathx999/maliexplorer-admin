import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ModerationPartenaireService } from '../../services/moderation-partenaire.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  hasPartnershipBadge?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  standalone?: boolean;
  items: NavItem[];
}

/**
 * Barre latérale de navigation administrateur MaliExplorer.
 * - Regroupement thématique en 7 grandes catégories avec menus accordéons.
 * - Mode développé (icônes + textes + catégories) et mode compact (icônes centrées + infobulles).
 * - Persistance de l'état dans localStorage sans saut visuel.
 * - Badge dynamique temps réel pour les demandes de partenariat en attente.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly moderationService = inject(ModerationPartenaireService);

  private readonly STORAGE_COLLAPSED_KEY = 'maliexplorer_sidebar_collapsed';
  private readonly STORAGE_GROUPS_KEY = 'maliexplorer_sidebar_open_groups';
  private routerSub?: Subscription;

  // État rétracté (mode compact) ou déplié (mode développé)
  readonly isCollapsed = signal<boolean>(false);

  // État du tiroir mobile sur petits écrans
  readonly isMobileOpen = signal<boolean>(false);

  // État d'ouverture des groupes accordéons
  readonly openGroups = signal<Record<string, boolean>>({
    patrimoine: true,
    culture: true,
    tourisme: true,
    partenariats: true,
    jeux: true,
    administration: true
  });

  // Compteur réactif des demandes de partenariat en attente
  readonly pendingPartnershipCount = this.moderationService.pendingCount;

  // Infobulle flottante en mode compact (évite toute troncature par overflow-y)
  readonly hoveredTooltip = signal<{
    label: string;
    category: string;
    badgeCount: number;
    top: number;
  } | null>(null);

  // Organisation officielle des rubriques par grandes thématiques
  readonly navGroups: NavGroup[] = [
    {
      id: 'dashboard',
      title: 'TABLEAU DE BORD',
      standalone: true,
      items: [
        { label: 'Tableau de bord', route: '/dashboard', icon: 'dashboard' }
      ]
    },
    {
      id: 'patrimoine',
      title: 'PATRIMOINE — GÉOGRAPHIE & HISTOIRE',
      items: [
        { label: 'Les régions', route: '/regions', icon: 'map' },
        { label: 'Les villes', route: '/villes', icon: 'building' },
        { label: 'Lieux historiques', route: '/lieux-historiques', icon: 'landmark' },
        { label: 'Les présidents', route: '/presidents', icon: 'award' }
      ]
    },
    {
      id: 'culture',
      title: 'CULTURE & TRADITIONS',
      items: [
        { label: 'Les ethnies', route: '/ethnies', icon: 'users' },
        { label: 'Les religions', route: '/religions', icon: 'sun' },
        { label: 'Langues nationales', route: '/langues', icon: 'languages' }
      ]
    },
    {
      id: 'tourisme',
      title: 'TOURISME & VIE PRATIQUE',
      items: [
        { label: 'Gestion diaporama', route: '/home-slides', icon: 'image' },
        { label: 'Événements', route: '/evenements', icon: 'calendar' },
        { label: 'Les plats', route: '/plats', icon: 'utensils' },
        { label: 'Les ingrédients', route: '/ingredients', icon: 'carrot' },
        { label: 'Infos pratiques', route: '/infos-pratiques', icon: 'info' }
      ]
    },
    {
      id: 'partenariats',
      title: 'PARTENARIATS',
      items: [
        { label: 'Partenaires', route: '/partenaires', icon: 'handshake' },
        {
          label: 'Demandes de partenariat',
          route: '/demandes-partenariat',
          icon: 'clipboard',
          hasPartnershipBadge: true
        }
      ]
    },
    {
      id: 'jeux',
      title: 'JEUX & ÉVALUATION',
      items: [
        { label: 'Les quiz', route: '/quiz', icon: 'help-circle' },
        { label: 'Les questions', route: '/questions', icon: 'lightbulb' }
      ]
    },
    {
      id: 'administration',
      title: 'ADMINISTRATION',
      items: [
        { label: 'Utilisateurs', route: '/utilisateurs', icon: 'user' },
        { label: 'Administrateurs', route: '/administrateurs', icon: 'shield' }
      ]
    }
  ];

  constructor() {
    // Restauration synchrone de la préférence utilisateur pour éviter tout saut visuel
    this.restorePreferences();
  }

  ngOnInit(): void {
    // Ouvrir automatiquement la catégorie contenant la route active
    this.ensureActiveGroupOpen(this.router.url);

    // Charger le compteur réel des demandes de partenariat en attente
    this.moderationService.refreshPendingCount();

    // Suivre les changements de navigation
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.ensureActiveGroupOpen(event.urlAfterRedirects);
        this.isMobileOpen.set(false);
        this.hoveredTooltip.set(null);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Restaure l'état compact/développé et l'état des accordéons depuis localStorage.
   */
  private restorePreferences(): void {
    if (!this.isBrowser()) return;
    try {
      const savedCollapsed = localStorage.getItem(this.STORAGE_COLLAPSED_KEY);
      if (savedCollapsed !== null) {
        this.isCollapsed.set(savedCollapsed === 'true');
      }

      const savedGroups = localStorage.getItem(this.STORAGE_GROUPS_KEY);
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (parsed && typeof parsed === 'object') {
          this.openGroups.set({
            ...this.openGroups(),
            ...parsed
          });
        }
      }
    } catch (e) {
      console.warn('Impossible de restaurer les préférences de la sidebar :', e);
    }
  }

  /**
   * Bascule explicitement entre le mode développé et le mode compact.
   */
  toggleSidebar(): void {
    const nextState = !this.isCollapsed();
    this.isCollapsed.set(nextState);
    this.hoveredTooltip.set(null);
    if (this.isBrowser()) {
      try {
        localStorage.setItem(this.STORAGE_COLLAPSED_KEY, String(nextState));
      } catch (e) {
        console.warn('Impossible de sauvegarder l’état de la sidebar :', e);
      }
    }
  }

  /**
   * Ouvre ou ferme le tiroir de navigation sur mobile/tablette.
   */
  toggleMobileMenu(): void {
    this.isMobileOpen.set(!this.isMobileOpen());
  }

  closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }

  /**
   * Ouvre ou ferme une section accordéon en mode développé.
   */
  toggleGroup(groupId: string): void {
    const current = this.openGroups();
    const updated = {
      ...current,
      [groupId]: !current[groupId]
    };
    this.openGroups.set(updated);
    if (this.isBrowser()) {
      try {
        localStorage.setItem(this.STORAGE_GROUPS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Impossible de sauvegarder l’état des accordéons :', e);
      }
    }
  }

  /**
   * Indique si une section accordéon est ouverte.
   */
  isGroupOpen(groupId: string): boolean {
    return Boolean(this.openGroups()[groupId]);
  }

  /**
   * Indique si une catégorie contient la rubrique actuellement active.
   */
  isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => this.isItemActive(item));
  }

  /**
   * S'assure que la catégorie contenant la page active est ouverte.
   */
  private ensureActiveGroupOpen(url: string): void {
    for (const group of this.navGroups) {
      if (!group.standalone && group.items.some((item) => this.checkUrlMatch(url, item.route))) {
        const current = this.openGroups();
        if (!current[group.id]) {
          this.openGroups.set({ ...current, [group.id]: true });
        }
      }
    }
  }

  /**
   * Vérifie si un élément de menu correspond à la route active.
   */
  isItemActive(item: NavItem): boolean {
    return this.checkUrlMatch(this.router.url, item.route);
  }

  private checkUrlMatch(currentUrl: string, itemRoute: string): boolean {
    if (
      itemRoute === '/evenements' &&
      (currentUrl.includes('/evenements') || currentUrl.includes('/validation-evenement'))
    ) {
      return true;
    }
    return (
      currentUrl === itemRoute ||
      currentUrl.startsWith(itemRoute + '/') ||
      currentUrl.startsWith(itemRoute + '?')
    );
  }

  /**
   * Texte d'infobulle natif et accessible pour chaque rubrique.
   */
  getItemTooltip(item: NavItem): string {
    if (item.hasPartnershipBadge && this.pendingPartnershipCount() > 0) {
      const count = this.pendingPartnershipCount();
      return `${item.label} (${count} demande${count > 1 ? 's' : ''} en attente)`;
    }
    return item.label;
  }

  /**
   * Affiche l'infobulle latérale lors du survol d'une icône en mode compact.
   * Ne déplie jamais automatiquement toute la sidebar.
   */
  onItemMouseEnter(event: MouseEvent, item: NavItem, group: NavGroup): void {
    if (!this.isCollapsed()) {
      this.hoveredTooltip.set(null);
      return;
    }
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    this.hoveredTooltip.set({
      label: item.label,
      category: group.title,
      badgeCount: item.hasPartnershipBadge ? this.pendingPartnershipCount() : 0,
      top: rect.top + rect.height / 2
    });
  }

  onItemMouseLeave(): void {
    this.hoveredTooltip.set(null);
  }

  logout(): void {
    if (confirm('Voulez-vous vous déconnecter de l’administration MaliExplorer ?')) {
      this.authService.logout();
    }
  }
}
