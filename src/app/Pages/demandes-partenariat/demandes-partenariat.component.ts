import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ModerationPartenaireService } from '../../services/moderation-partenaire.service';
import { DialogService } from '../../services/dialog.service';
import { OpportuniteResponseDTO } from '../../models/partenaire.model';

export type ModerationTab =
  | 'TOUS_ATTENTE'
  | 'GUIDES_ATTENTE'
  | 'PROMOTEURS_ATTENTE'
  | 'VALIDE'
  | 'REJETE';

/**
 * Composant de modération des demandes et opportunités de partenariat.
 * Permet d'examiner les dossiers soumis par les promoteurs d'événements et les guides touristiques,
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
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Onglet actif : 5 onglets de filtrage
  activeTab: ModerationTab = 'TOUS_ATTENTE';

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

  // Helpers de détection de type
  isGuide(demande: OpportuniteResponseDTO | null | undefined): boolean {
    if (!demande) return false;
    const type = (demande.typePartenaire || '').toUpperCase();
    const role = (demande.role || '').toUpperCase();
    return type === 'GUIDE' || role.includes('GUIDE');
  }

  isPromoteur(demande: OpportuniteResponseDTO | null | undefined): boolean {
    if (!demande) return false;
    const type = (demande.typePartenaire || '').toUpperCase();
    const role = (demande.role || '').toUpperCase();
    return type === 'PROMOTEUR' || role.includes('PROMOTEUR') || (!this.isGuide(demande) && !type.includes('INVESTISSEUR'));
  }

  isPendingTab(): boolean {
    return (
      this.activeTab === 'TOUS_ATTENTE' ||
      this.activeTab === 'GUIDES_ATTENTE' ||
      this.activeTab === 'PROMOTEURS_ATTENTE'
    );
  }

  // Getters réactifs pour les compteurs d'onglets
  get totalEnAttenteCount(): number {
    return this.demandesEnAttente.length;
  }

  get guidesEnAttenteCount(): number {
    return this.demandesEnAttente.filter((d) => this.isGuide(d)).length;
  }

  get promoteursEnAttenteCount(): number {
    return this.demandesEnAttente.filter((d) => this.isPromoteur(d)).length;
  }

  get valideesCount(): number {
    return this.demandesValidees.length;
  }

  get rejeteesCount(): number {
    return this.demandesRejetees.length;
  }

  ngOnInit(): void {
    this.chargerToutesLesDemandes();
  }

  /**
   * Charge toutes les candidatures (en attente, validées et rejetées).
   */
  chargerToutesLesDemandes(): void {
    this.isLoading = true;
    forkJoin({
      enAttente: this.moderationService.getDemandesEnAttente().pipe(catchError(() => of([]))),
      validees: this.moderationService.getDemandesValidees().pipe(catchError(() => of([]))),
      rejetees: this.moderationService.getDemandesRejetees().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ enAttente, validees, rejetees }) => {
        this.demandesEnAttente = Array.isArray(enAttente) ? enAttente : [];
        this.demandesValidees = Array.isArray(validees) ? validees : [];
        this.demandesRejetees = Array.isArray(rejetees) ? rejetees : [];
        this.isLoading = false;
        this.appliquerFiltres();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement dossiers de modération :', err);
        this.demandesEnAttente = [];
        this.demandesValidees = [];
        this.demandesRejetees = [];
        this.isLoading = false;
        this.appliquerFiltres();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Bascule d'onglet de modération.
   */
  switchTab(tab: ModerationTab): void {
    this.activeTab = tab;
    this.appliquerFiltres();
  }

  /**
   * Filtre la liste active selon l'onglet courant et le texte recherché.
   */
  appliquerFiltres(): void {
    let list: OpportuniteResponseDTO[] = [];
    if (this.activeTab === 'TOUS_ATTENTE') {
      list = [...this.demandesEnAttente];
    } else if (this.activeTab === 'GUIDES_ATTENTE') {
      list = this.demandesEnAttente.filter((d) => this.isGuide(d));
    } else if (this.activeTab === 'PROMOTEURS_ATTENTE') {
      list = this.demandesEnAttente.filter((d) => this.isPromoteur(d));
    } else if (this.activeTab === 'VALIDE') {
      list = [...this.demandesValidees];
    } else if (this.activeTab === 'REJETE') {
      list = [...this.demandesRejetees];
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter((d) =>
        (d.nomComplet && d.nomComplet.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.telephone && d.telephone.toLowerCase().includes(q)) ||
        (d.titreProjet && d.titreProjet.toLowerCase().includes(q)) ||
        (d.besoinPartenariat && d.besoinPartenariat.toLowerCase().includes(q)) ||
        (d.specialiteOuOrganisation && d.specialiteOuOrganisation.toLowerCase().includes(q)) ||
        (d.nomOrganisation && d.nomOrganisation.toLowerCase().includes(q)) ||
        (d.langue && d.langue.toLowerCase().includes(q)) ||
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
  async validerDossier(demande: OpportuniteResponseDTO, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Validation de partenariat',
      message: `Confirmez-vous la validation officielle du dossier de partenariat de « ${demande.nomComplet} » ?`,
      confirmText: 'Valider officiellement',
      cancelText: 'Annuler',
      type: 'success'
    });

    if (!confirmed) return;

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

        this.dialogService.toastSuccess(`Le dossier de « ${demande.nomComplet} » a été validé avec succès !`);
        this.appliquerFiltres();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors de la validation :', err);
        this.isSubmittingAction = false;
        this.dialogService.toastError(
          err?.error?.message || `Erreur lors de la validation du dossier de « ${demande.nomComplet} ».`
        );
        this.cdr.detectChanges();
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
        this.dialogService.toastWarning(`Le dossier de « ${target.nomComplet} » a été rejeté avec motif.`);
        this.appliquerFiltres();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur rejet :', err);
        this.isSubmittingAction = false;
        this.fermerModaleRejet();
        if (this.isDetailsModalOpen) this.fermerModalDetails();
        this.dialogService.toastError(
          err?.error?.message || `Erreur lors du rejet du dossier de « ${target.nomComplet} ».`
        );
        this.cdr.detectChanges();
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
