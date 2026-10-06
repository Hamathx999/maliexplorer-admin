import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LieuHistoriqueService } from '../../services/lieu-historique.service';
import { UserService } from '../../services/user.service';
import { EvenementService } from '../../services/evenement.service';
import { QuizService } from '../../services/quiz.service';
import { LieuHistorique } from '../../models/lieu-historique.model';
import { User } from '../../models/user.model';
import { Evenement } from '../../models/evenement.model';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface KpiCard {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface ContentToValidate {
  id?: number | string;
  title: string;
  category: string;
  timeAgo: string;
  status: string;
  imageUrl: string;
}

export interface UserItem {
  id?: number | string;
  name: string;
  email: string;
  role: string;
  registrationDate: string;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarBg?: string;
  avatarColor?: string;
}

export interface PartnershipRequest {
  id?: number | string;
  title: string;
  subtitle: string;
  timeAgo: string;
  status: string;
  iconType: string;
  iconColor: string;
  iconBg: string;
  route?: string;
}

export interface ChartHoverInfo {
  date: string;
  visitors: string;
  pageViews: string;
  x: number;
  yYellow: number;
  yTeal: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly lieuService = inject(LieuHistoriqueService);
  private readonly userService = inject(UserService);
  private readonly evenementService = inject(EvenementService);
  private readonly quizService = inject(QuizService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // 1. KPI Cards
  kpiCards: KpiCard[] = [
    {
      label: 'Utilisateurs',
      value: '0',
      icon: 'user',
      iconBg: '#E6F7F3',
      iconColor: '#0E8F76'
    },
    {
      label: 'Partenaires',
      value: '0',
      icon: 'handshake',
      iconBg: '#FEF3C7',
      iconColor: '#D97706'
    },
    {
      label: 'Lieux historiques',
      value: '0',
      icon: 'map',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7'
    },
    {
      label: 'Événements',
      value: '0',
      icon: 'calendar',
      iconBg: '#FFE4E6',
      iconColor: '#E11D48'
    }
  ];

  // 2. Contenus récents à valider (100% dynamiques depuis les événements de la base)
  recentContents: ContentToValidate[] = [];

  // 3. Gestion rapide
  quickActions = [
    { label: 'Ajouter un lieu', icon: 'map-pin', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/lieux-historiques/ajouter' },
    { label: 'Gestion des événements', icon: 'calendar', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/evenements' },
    { label: 'Tous les lieux historiques', icon: 'landmark', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/lieux-historiques' }
  ];

  // 4. Derniers utilisateurs (100% dynamiques depuis les utilisateurs de la base)
  recentUsers: UserItem[] = [];

  // 5. Demandes de partenariat (100% dynamiques depuis les opportunités / partenaires de la base)
  partnershipRequests: PartnershipRequest[] = [];

  // 6. Interactive Chart Tooltip State
  chartPoints: ChartHoverInfo[] = [
    { date: '1 Avr', visitors: '240 explorateurs', pageViews: '680 vues', x: 60, yYellow: 180, yTeal: 185 },
    { date: '5 Avr', visitors: '510 explorateurs', pageViews: '1 230 vues', x: 160, yYellow: 170, yTeal: 175 },
    { date: '10 Avr', visitors: '420 explorateurs', pageViews: '1 050 vues', x: 260, yYellow: 135, yTeal: 130 },
    { date: '15 Avr', visitors: '730 explorateurs', pageViews: '1 890 vues', x: 360, yYellow: 160, yTeal: 145 },
    { date: '20 Avr', visitors: '690 explorateurs', pageViews: '1 720 vues', x: 460, yYellow: 140, yTeal: 130 },
    { date: '24 Avr', visitors: '980 explorateurs', pageViews: '2 640 vues', x: 560, yYellow: 188, yTeal: 70 }
  ];
  activeChartPoint: ChartHoverInfo | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // 1. Lieux historiques (direct depuis Spring Boot MySQL)
    this.lieuService.getLieux().subscribe({
      next: (lieux: LieuHistorique[]) => {
        const kpi = this.kpiCards.find((c) => c.label === 'Lieux historiques');
        if (kpi) {
          kpi.value = (lieux ? lieux.length : 0).toString();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        const kpi = this.kpiCards.find((c) => c.label === 'Lieux historiques');
        if (kpi) kpi.value = '0';
        this.cdr.markForCheck();
      }
    });

    // 2. Utilisateurs réels (direct depuis Spring Boot MySQL)
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        const realUsers = Array.isArray(users) ? users : [];
        const kpiUsers = this.kpiCards.find((c) => c.label === 'Utilisateurs');
        if (kpiUsers) {
          kpiUsers.value = realUsers.length >= 1000 ? realUsers.length.toLocaleString('fr-FR') : realUsers.length.toString();
        }

        const kpiPartenaires = this.kpiCards.find((c) => c.label === 'Partenaires');
        if (kpiPartenaires) {
          const partenairesCount = realUsers.filter((u) => {
            const r = (u.role || '').toLowerCase();
            return r.includes('partenaire') || r.includes('promoteur') || r.includes('artisan') || r.includes('guide');
          }).length;
          kpiPartenaires.value = partenairesCount.toString();
        }

        // Seuls les vrais utilisateurs de la base sont affichés
        if (realUsers.length > 0) {
          this.recentUsers = realUsers.slice(0, 4).map((u) => {
            const fullName = `${u.prenom || ''} ${u.nom || ''}`.trim() || 'Utilisateur';
            const colors = this.getAvatarColor(fullName);
            return {
              id: u.id,
              name: fullName,
              email: u.email,
              role: u.role || 'Explorateur',
              registrationDate: u.dateInscription || 'Inscrit récemment',
              avatarUrl: u.photoUrl || '',
              avatarInitials: (u.prenom?.charAt(0) || u.nom?.charAt(0) || 'U').toUpperCase(),
              avatarBg: colors.bg,
              avatarColor: colors.color
            };
          });
        } else {
          this.recentUsers = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        const kpiUsers = this.kpiCards.find((c) => c.label === 'Utilisateurs');
        if (kpiUsers) kpiUsers.value = '0';
        const kpiPartenaires = this.kpiCards.find((c) => c.label === 'Partenaires');
        if (kpiPartenaires) kpiPartenaires.value = '0';
        this.recentUsers = [];
        this.cdr.markForCheck();
      }
    });

    // 3. Événements réels (direct depuis la base de données)
    this.evenementService.getEvenements().subscribe({
      next: (events: Evenement[]) => {
        const realEvents = Array.isArray(events) ? events : [];
        const kpiEvents = this.kpiCards.find((c) => c.label === 'Événements');
        if (kpiEvents) {
          kpiEvents.value = realEvents.length.toString();
        }

        if (realEvents.length > 0) {
          const pending = realEvents.filter((e) => e.statut === 'EN_ATTENTE');
          const listToDisplay = pending.length > 0 ? pending : realEvents;
          this.recentContents = listToDisplay.slice(0, 3).map((e) => ({
            id: e.id,
            title: e.titre || 'Événement culturel',
            category: e.categorie || 'Événement',
            timeAgo: e.ville ? `${e.ville} • ${e.dateDebut || 'À venir'}` : (e.dateDebut ? `Prévu le ${e.dateDebut}` : 'Récemment soumis'),
            status: (e.statut === 'APPROUVE' || e.statut === 'VALIDE') ? 'Validé' : (e.statut === 'REFUSE' ? 'Refusé' : 'En attente'),
            imageUrl: this.getEventFallbackImage(e)
          }));
        } else {
          this.recentContents = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        const kpiEvents = this.kpiCards.find((c) => c.label === 'Événements');
        if (kpiEvents) kpiEvents.value = '0';
        this.recentContents = [];
        this.cdr.markForCheck();
      }
    });

    // 4. Demandes de partenariat réelles (direct depuis l'API backend opportunités / partenaires)
    this.loadRealPartnerships();
  }

  loadRealPartnerships(): void {
    // On consulte d'abord les opportunités en attente de validation admin, puis le catalogue validé
    this.http.get<any[]>(`${environment.apiUrl}/admin/moderation/opportunites`).subscribe({
      next: (opps) => {
        if (Array.isArray(opps) && opps.length > 0) {
          this.displayPartnershipOpportunities(opps);
        } else {
          // Si aucune opportunité admin en attente, consulter les opportunités générales de la base
          this.http.get<any[]>(`${environment.apiUrl}/opportunites`).subscribe({
            next: (catalogue) => {
              if (Array.isArray(catalogue) && catalogue.length > 0) {
                this.displayPartnershipOpportunities(catalogue);
              } else {
                this.partnershipRequests = [];
                this.cdr.markForCheck();
              }
            },
            error: () => {
              this.partnershipRequests = [];
              this.cdr.markForCheck();
            }
          });
        }
      },
      error: () => {
        // En cas d'erreur ou d'absence de droits admin sur ce endpoint, vérifier /api/opportunites
        this.http.get<any[]>(`${environment.apiUrl}/opportunites`).subscribe({
          next: (catalogue) => {
            if (Array.isArray(catalogue) && catalogue.length > 0) {
              this.displayPartnershipOpportunities(catalogue);
            } else {
              this.partnershipRequests = [];
              this.cdr.markForCheck();
            }
          },
          error: () => {
            this.partnershipRequests = [];
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  private displayPartnershipOpportunities(opps: any[]): void {
    this.partnershipRequests = opps.slice(0, 3).map((item) => {
      const typeStr = (item.typePartenaire || item.role || 'Partenaire').toUpperCase();
      let iconType = 'building';
      let iconColor = '#D97706';
      let iconBg = '#FEF3C7';

      if (typeStr.includes('ARTISAN')) {
        iconType = 'leaf';
        iconColor = '#10B981';
        iconBg = '#ECFDF5';
      } else if (typeStr.includes('GUIDE')) {
        iconType = 'compass';
        iconColor = '#0284C7';
        iconBg = '#F0F9FF';
      }

      const statusLabel =
        item.statutModeration === 'VALIDE' ? 'Validé' :
        item.statutModeration === 'REJETE' ? 'Refusé' : 'En attente';

      return {
        id: item.idUsers,
        title: item.titreProjet || item.nomComplet || 'Demande de partenariat',
        subtitle: item.besoinPartenariat || item.specialiteOuOrganisation || item.adresse || 'Recherche de partenaires',
        timeAgo: item.adresse ? `${item.adresse}` : 'Récemment soumis',
        status: statusLabel,
        iconType: iconType,
        iconColor: iconColor,
        iconBg: iconBg,
        route: '/utilisateurs'
      };
    });
    this.cdr.markForCheck();
  }

  getAvatarColor(name: string): { bg: string; color: string } {
    const palette = [
      { bg: '#E8F5E9', color: '#1B5E20' }, // Forest emerald
      { bg: '#E3F2FD', color: '#0D47A1' }, // Deep sky blue
      { bg: '#FFF3E0', color: '#E65100' }, // Warm terra cotta
      { bg: '#F3E5F5', color: '#4A148C' }, // Royal violet
      { bg: '#FCE4EC', color: '#880E4F' }, // Warm crimson rose
      { bg: '#E0F2F1', color: '#004D40' }, // Deep teal
      { bg: '#FEF9C3', color: '#854D0E' }  // Golden amber
    ];
    let hash = 0;
    const str = (name || 'Utilisateur').trim();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  getEventFallbackImage(event: Evenement): string {
    const title = (event.titre || '').toLowerCase();
    if (title.includes('balafon') || title.includes('musique')) {
      return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop';
    }
    if (title.includes('masque') || title.includes('dogon')) {
      return 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?q=80&w=300&auto=format&fit=crop';
    }
    if (title.includes('niger') || title.includes('fleuve') || title.includes('ségou')) {
      return 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=300&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=300&auto=format&fit=crop';
  }

  navigateToContent(item: ContentToValidate): void {
    if (item.id) {
      this.router.navigate(['/validation-evenement', item.id]);
    } else {
      this.router.navigate(['/evenements']);
    }
  }

  navigateToAllContents(): void {
    this.router.navigate(['/evenements']);
  }

  navigateToAllUsers(): void {
    this.router.navigate(['/utilisateurs']);
  }

  navigateToPartners(): void {
    this.router.navigate(['/validation-evenement']);
  }

  handleQuickAction(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  setChartPoint(point: ChartHoverInfo | null): void {
    this.activeChartPoint = point;
  }
}
