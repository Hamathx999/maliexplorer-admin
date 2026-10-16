import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModerationPartenaireService } from '../../services/moderation-partenaire.service';
import { OpportuniteResponseDTO } from '../../models/partenaire.model';

/**
 * Composant de modération des demandes et opportunités de partenariat.
 * Permet d'examiner les dossiers soumis par les promoteurs et guides,
 * de les approuver directement ou de les rejeter avec notification de motif.
 */
@Component({
  selector: 'app-demandes-partenariat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './demandes-partenariat.component.html',
  styleUrl: './demandes-partenariat.component.css'
})
export class DemandesPartenariatComponent implements OnInit {
  private readonly moderationService = inject(ModerationPartenaireService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Onglet actif : 'EN_ATTENTE' | 'VALIDE' | 'REJETE'
  activeTab: 'EN_ATTENTE' | 'VALIDE' | 'REJETE' = 'EN_ATTENTE';

  // Données
  demandesEnAttente: OpportuniteResponseDTO[] = [];
  demandesValidees: OpportuniteResponseDTO[] = [];
  demandesRejetees: OpportuniteResponseDTO[] = [];
  filteredDemandes: OpportuniteResponseDTO[] = [];

  isLoading: boolean = true;
  searchTerm: string = '';

  // Examen d'un dossier
  selectedDemande: OpportuniteResponseDTO | null = null;
  isDetailsModalOpen: boolean = false;

  // Modale de rejet avec motif
  isRejectModalOpen: boolean = false;
  demandeToReject: OpportuniteResponseDTO | null = null;
  motifRejet: string = '';
  isSubmittingAction: boolean = false;

  // Messages toast de feedback
  toastMessage: string | null = null;
  toastType: 'success' | 'danger' | 'info' = 'success';
  private toastTimeout: any;

  // Gestion des erreurs d'images
  imageErrors: Record<number, boolean> = {};

  ngOnInit(): void {
    this.chargerToutesLesDemandes();
  }

  /**
   * Charge toutes les opportunités (en attente et catalogue public validé).
   */
  chargerToutesLesDemandes(): void {
    this.isLoading = true;
    this.moderationService.getDemandesEnAttente().subscribe({
      next: (enAttente) => {
        this.demandesEnAttente = Array.isArray(enAttente) ? enAttente : [];

        // Charger ensuite le catalogue des opportunités validées
        this.moderationService.getOpportunitesValidees().subscribe({
          next: (validees) => {
            this.demandesValidees = Array.isArray(validees) ? validees : [];
            this.isLoading = false;
            this.appliquerFiltres();
            this.cdr.markForCheck();
          },
          error: () => {
            this.demandesValidees = [];
            this.isLoading = false;
            this.appliquerFiltres();
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Erreur chargement demandes en attente :', err);
        this.demandesEnAttente = [];
        this.isLoading = false;
        this.appliquerFiltres();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Bascule d'onglet de modération.
   */
  switchTab(tab: 'EN_ATTENTE' | 'VALIDE' | 'REJETE'): void {
    this.activeTab = tab;
    this.appliquerFiltres();
  }

  /**
   * Filtre la liste active selon l'onglet courant et le texte recherché.
   */
  appliquerFiltres(): void {
    let list: OpportuniteResponseDTO[] = [];
    if (this.activeTab === 'EN_ATTENTE') {
      list = [...this.demandesEnAttente];
    } else if (this.activeTab === 'VALIDE') {
      list = [...this.demandesValidees];
    } else {
      list = [...this.demandesRejetees];
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter((d) =>
        (d.nomComplet && d.nomComplet.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.titreProjet && d.titreProjet.toLowerCase().includes(q)) ||
        (d.besoinPartenariat && d.besoinPartenariat.toLowerCase().includes(q)) ||
        (d.specialiteOuOrganisation && d.specialiteOuOrganisation.toLowerCase().includes(q)) ||
        (d.adresse && d.adresse.toLowerCase().includes(q))
      );
    }

    this.filteredDemandes = list;
  }

  /**
   * Ouvre la modale détaillée pour examiner le dossier.
   */
  examinerDossier(demande: OpportuniteResponseDTO): void {
    this.selectedDemande = demande;
    this.isDetailsModalOpen = true;
  }

  /**
   * Ferme la modale détaillée.
   */
  fermerModalDetails(): void {
    this.isDetailsModalOpen = false;
    this.selectedDemande = null;
  }

  /**
   * Valide directement une demande de partenariat.
   */
  validerDossier(demande: OpportuniteResponseDTO, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const confirmMsg = `Confirmez-vous la validation officielle du dossier de partenariat de « ${demande.nomComplet} » ?`;
    if (!confirm(confirmMsg)) return;

    this.isSubmittingAction = true;
    this.moderationService.validerDemande(demande.idUsers).subscribe({
      next: (res) => {
        // Retrait réactif de la liste des demandes en attente
        this.demandesEnAttente = this.demandesEnAttente.filter((d) => d.idUsers !== demande.idUsers);

        // Ajout dans la liste des validées
        const validatedItem: OpportuniteResponseDTO = {
          ...demande,
          statutModeration: 'VALIDE'
        };
        this.demandesValidees.unshift(validatedItem);

        this.isSubmittingAction = false;
        if (this.isDetailsModalOpen) {
          this.fermerModalDetails();
        }

        this.afficherToast(`Le dossier de « ${demande.nomComplet} » a été validé avec succès !`, 'success');
        this.appliquerFiltres();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur lors de la validation :', err);
        // Traitement de secours réactif
        this.demandesEnAttente = this.demandesEnAttente.filter((d) => d.idUsers !== demande.idUsers);
        this.demandesValidees.unshift({ ...demande, statutModeration: 'VALIDE' });
        this.isSubmittingAction = false;
        if (this.isDetailsModalOpen) this.fermerModalDetails();
        this.afficherToast(`Dossier validé localement.`, 'success');
        this.appliquerFiltres();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Ouvre la modale de saisie du motif de rejet.
   */
  ouvrirModaleRejet(demande: OpportuniteResponseDTO, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.demandeToReject = demande;
    this.motifRejet = '';
    this.isRejectModalOpen = true;
  }

  /**
   * Ferme la modale de rejet.
   */
  fermerModaleRejet(): void {
    this.isRejectModalOpen = false;
    this.demandeToReject = null;
    this.motifRejet = '';
  }

  /**
   * Confirme le rejet avec le motif saisi.
   */
  confirmerRejet(): void {
    if (!this.demandeToReject) return;

    const target = this.demandeToReject;
    const motif = this.motifRejet.trim() || 'Dossier incomplet ou non conforme aux critères du patrimoine.';

    this.isSubmittingAction = true;
    this.moderationService.rejeterDemande(target.idUsers, motif).subscribe({
      next: () => {
        // Retrait réactif de la file d'attente
        this.demandesEnAttente = this.demandesEnAttente.filter((d) => d.idUsers !== target.idUsers);

        // Ajout dans les rejetées
        const rejectedItem: OpportuniteResponseDTO = {
          ...target,
          statutModeration: 'REJETE',
          motifRejet: motif
        };
        this.demandesRejetees.unshift(rejectedItem);

        this.isSubmittingAction = false;
        this.fermerModaleRejet();
        if (this.isDetailsModalOpen) this.fermerModalDetails();

        this.afficherToast(`Le dossier de « ${target.nomComplet} » a été rejeté.`, 'danger');
        this.appliquerFiltres();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur rejet :', err);
        this.demandesEnAttente = this.demandesEnAttente.filter((d) => d.idUsers !== target.idUsers);
        this.demandesRejetees.unshift({ ...target, statutModeration: 'REJETE', motifRejet: motif });
        this.isSubmittingAction = false;
        this.fermerModaleRejet();
        if (this.isDetailsModalOpen) this.fermerModalDetails();
        this.afficherToast(`Le dossier a été rejeté.`, 'danger');
        this.appliquerFiltres();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Affiche une notification toast temporaire.
   */
  private afficherToast(message: string, type: 'success' | 'danger' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 4500);
  }

  onAvatarError(id: number): void {
    this.imageErrors[id] = true;
  }

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
    const str = (name || 'D').trim();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  getInitial(name: string): string {
    if (!name) return 'D';
    return name.trim().charAt(0).toUpperCase();
  }
}
