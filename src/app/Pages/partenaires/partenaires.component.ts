import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PartenaireService } from '../../services/partenaire.service';
import { PartenaireItem } from '../../models/partenaire.model';

/**
 * Composant de gestion des partenaires professionnels MaliExplorer.
 * Permet de superviser, filtrer et consulter les fiches détaillées
 * des Promoteurs culturels, Guides certifiés et Investisseurs B2B.
 */
@Component({
  selector: 'app-partenaires',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partenaires.component.html',
  styleUrl: './partenaires.component.css'
})
export class PartenairesComponent implements OnInit {
  private readonly partenaireService = inject(PartenaireService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Données de la liste
  partenaires: PartenaireItem[] = [];
  filteredPartenaires: PartenaireItem[] = [];
  isLoading: boolean = true;

  // Filtres
  searchTerm: string = '';
  selectedRole: string = 'TOUS'; // 'TOUS' | 'PROMOTEUR' | 'GUIDE' | 'INVESTISSEUR'
  selectedStatus: string = 'TOUS'; // 'TOUS' | 'ACTIF' | 'BLOQUE'

  // Indicateurs KPI
  totalCount: number = 0;
  promoteursCount: number = 0;
  guidesCount: number = 0;
  investisseursCount: number = 0;

  // Gestion de la modale de détails
  selectedPartenaire: PartenaireItem | null = null;
  isDetailsModalOpen: boolean = false;

  // Gestion des erreurs d'images
  imageErrors: Record<number, boolean> = {};

  ngOnInit(): void {
    this.chargerPartenaires();
  }

  /**
   * Charge la liste des partenaires depuis le service dédié.
   */
  chargerPartenaires(): void {
    this.isLoading = true;
    this.partenaireService.getPartenaires().subscribe({
      next: (data) => {
        this.partenaires = Array.isArray(data) ? data : [];
        this.calculerIndicateurs();
        this.appliquerFiltres();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des partenaires :', err);
        this.partenaires = [];
        this.filteredPartenaires = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Recalcule les compteurs d'indicateurs KPI selon les rôles.
   */
  calculerIndicateurs(): void {
    this.totalCount = this.partenaires.length;
    this.promoteursCount = this.partenaires.filter((p) => p.role === 'Promoteur').length;
    this.guidesCount = this.partenaires.filter((p) => p.role === 'Guide').length;
    this.investisseursCount = this.partenaires.filter((p) => p.role === 'Investisseur').length;
  }

  /**
   * Filtre dynamiquement la liste selon la recherche textuelle et les catégories.
   */
  appliquerFiltres(): void {
    let result = [...this.partenaires];

    // Filtre par catégorie de rôle
    if (this.selectedRole !== 'TOUS') {
      result = result.filter((p) => p.role.toUpperCase() === this.selectedRole.toUpperCase());
    }

    // Filtre par statut de compte
    if (this.selectedStatus !== 'TOUS') {
      result = result.filter((p) => p.statutCompte === this.selectedStatus);
    }

    // Filtre par recherche textuelle
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter((p) =>
        (p.nomComplet && p.nomComplet.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.organisation && p.organisation.toLowerCase().includes(q)) ||
        (p.specialite && p.specialite.toLowerCase().includes(q)) ||
        (p.adresse && p.adresse.toLowerCase().includes(q)) ||
        (p.titreProjet && p.titreProjet.toLowerCase().includes(q))
      );
    }

    this.filteredPartenaires = result;
  }

  /**
   * Bascule le rôle sélectionné pour le filtrage rapide par pilule.
   */
  selectRoleFilter(role: string): void {
    this.selectedRole = role;
    this.appliquerFiltres();
  }

  /**
   * Bascule le statut sélectionné (Tous, Actifs, Bloqués).
   */
  selectStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.appliquerFiltres();
  }

  /**
   * Ouvre la modale d'affichage des détails complets du partenaire.
   */
  ouvrirFichePartenaire(partenaire: PartenaireItem): void {
    this.selectedPartenaire = partenaire;
    this.isDetailsModalOpen = true;
  }

  /**
   * Ferme la modale de détails.
   */
  fermerModale(): void {
    this.isDetailsModalOpen = false;
    this.selectedPartenaire = null;
  }

  /**
   * Inverse le statut d'un compte partenaire (Actif <-> Bloqué).
   */
  basculerStatut(partenaire: PartenaireItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const action = partenaire.statutCompte === 'ACTIF' ? 'bloquer' : 'activer';
    const confirmMsg = `Confirmez-vous vouloir ${action} le compte de ${partenaire.nomComplet} ?`;

    if (confirm(confirmMsg)) {
      this.partenaireService.toggleStatutPartenaire(partenaire.id).subscribe({
        next: () => {
          partenaire.statutCompte = partenaire.statutCompte === 'ACTIF' ? 'BLOQUE' : 'ACTIF';
          if (this.selectedPartenaire && this.selectedPartenaire.id === partenaire.id) {
            this.selectedPartenaire.statutCompte = partenaire.statutCompte;
          }
          this.appliquerFiltres();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur lors du changement de statut :', err);
          // Basculement optimiste local
          partenaire.statutCompte = partenaire.statutCompte === 'ACTIF' ? 'BLOQUE' : 'ACTIF';
          this.appliquerFiltres();
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * Gestion des erreurs d'affichage d'avatar.
   */
  onAvatarError(id: number): void {
    this.imageErrors[id] = true;
  }

  /**
   * Génère une couleur harmonieuse et déterministe pour l'avatar.
   */
  getAvatarColor(name: string): { bg: string; color: string } {
    const palette = [
      { bg: '#E8F5E9', color: '#1B5E20' },
      { bg: '#E3F2FD', color: '#0D47A1' },
      { bg: '#FFF3E0', color: '#E65100' },
      { bg: '#F3E5F5', color: '#4A148C' },
      { bg: '#FCE4EC', color: '#880E4F' },
      { bg: '#E0F2F1', color: '#004D40' },
      { bg: '#FEF9C3', color: '#854D0E' }
    ];
    let hash = 0;
    const str = (name || 'P').trim();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  /**
   * Retourne l'initiale pour l'avatar textuel.
   */
  getInitial(name: string): string {
    if (!name) return 'P';
    return name.trim().charAt(0).toUpperCase();
  }
}
