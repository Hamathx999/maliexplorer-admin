import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LieuHistoriqueService } from '../../services/lieu-historique.service';
import { LieuHistorique } from '../../models/lieu-historique.model';

export interface KpiCard {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface ContentToValidate {
  title: string;
  category: string;
  timeAgo: string;
  status: string;
  imageUrl: string;
}

export interface UserItem {
  name: string;
  email: string;
  role: string;
  registrationDate: string;
  avatarUrl: string;
}

export interface PartnershipRequest {
  title: string;
  subtitle: string;
  timeAgo: string;
  status: string;
  iconType: string;
  iconColor: string;
  iconBg: string;
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
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadLieuxCount();
  }

  // 1. KPI Cards
  kpiCards: KpiCard[] = [
    {
      label: 'Utilisateurs',
      value: '12 483',
      // trend: '+ 12% ce mois',
      icon: 'user',
      iconBg: '#E6F7F3',
      iconColor: '#0E8F76'
    },
    {
      label: 'Partenaires',
      value: '247',
      // trend: '+ 8% ce mois',
      icon: 'handshake',
      iconBg: '#FEF3C7',
      iconColor: '#D97706'
    },
    {
      label: 'Lieux historiques',
      value: '86',
      // trend: '+ 15% ce mois',
      icon: 'map',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7'
    },
    {
      label: 'Événements',
      value: '32',
      // trend: '+ 5% ce mois',
      icon: 'calendar',
      iconBg: '#FFE4E6',
      iconColor: '#E11D48'
    }
  ];

  // 2. Contenus récents à valider
  recentContents: ContentToValidate[] = [
    {
      title: "Projet d'agro-écologie à Sikasso",
      category: 'Partenaire',
      timeAgo: 'Il y a 2 heures',
      status: 'En attente',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=300&auto=format&fit=crop'
    },
    {
      title: 'Festival des masques de Ségou',
      category: 'Événement',
      timeAgo: 'Il y a 5 heures',
      status: 'En attente',
      imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=300&auto=format&fit=crop'
    },
    {
      title: 'Artisanat en bois de Mopti',
      category: 'Produit artisanal',
      timeAgo: 'Il y a 1 jour',
      status: 'En attente',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?q=80&w=300&auto=format&fit=crop'
    }
  ];

  // 3. Gestion rapide
  quickActions = [
    { label: 'Ajouter un lieu', icon: 'map-pin', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/lieux-historiques/ajouter' },
    { label: 'Gestion des événements', icon: 'calendar', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/evenements' },
    { label: 'Tous les lieux historiques', icon: 'landmark', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/lieux-historiques' }
  ];

  // 4. Derniers utilisateurs
  recentUsers: UserItem[] = [
    {
      name: 'Oumar Coulibaly',
      email: 'oumar.c@gmail.com',
      role: 'Explorateur',
      registrationDate: '04/10/2026',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
    },
    {
      name: 'Fatoumata Diallo',
      email: 'fatou.diallo@orange.ml',
      role: 'Guide certifié',
      registrationDate: '03/10/2026',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
    },
    {
      name: 'Amadou Traoré',
      email: 'amadou.traore@artisan.ml',
      role: 'Artisan',
      registrationDate: '02/10/2026',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop'
    },
    {
      name: 'Aïssata Koné',
      email: 'aissata.kone@gmail.com',
      role: 'Explorateur',
      registrationDate: '01/10/2026',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'
    }
  ];

  // 5. Demandes de partenariat
  partnershipRequests: PartnershipRequest[] = [
    {
      title: 'Sikasso Bio',
      subtitle: 'Projet agro-écologique',
      timeAgo: 'Il y a 2 heures',
      status: 'En attente',
      iconType: 'leaf',
      iconColor: '#10B981',
      iconBg: '#ECFDF5'
    },
    {
      title: 'Bamako Invest',
      subtitle: 'Investissement Immobilier',
      timeAgo: 'Il y a 5 heures',
      status: 'En attente',
      iconType: 'building',
      iconColor: '#0284C7',
      iconBg: '#F0F9FF'
    },
    {
      title: 'Tombouctou Tours',
      subtitle: 'Agence de voyage locale',
      timeAgo: 'Il y a 1 jour',
      status: 'En attente',
      iconType: 'compass',
      iconColor: '#D97706',
      iconBg: '#FEF3C7'
    }
  ];

  loadLieuxCount(): void {
    this.lieuService.getLieux().subscribe({
      next: (lieux: LieuHistorique[]) => {
        const kpi = this.kpiCards.find((c) => c.label === 'Lieux historiques');
        if (kpi) {
          kpi.value = lieux.length.toString();
        }
      },
      error: (err: unknown) => console.error('Erreur chargement lieux pour KPI', err)
    });
  }

  handleQuickAction(action: { route: string }): void {
    if (action.route) {
      this.router.navigate([action.route]);
    }
  }
}
