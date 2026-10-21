import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { InfoPratiqueService } from '../../services/info-pratique.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { InfoPratique } from '../../models/info-pratique.model';

/**
 * Composant d'administration des fiches d'informations pratiques pour les voyageurs au Mali.
 * Gère le listing filtrable par catégorie, l'ajout, la modification, la suppression,
 * la publication et le téléversement d'illustrations vers Supabase Storage.
 */
@Component({
  selector: 'app-infos-pratiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './infos-pratiques.component.html',
  styleUrl: './infos-pratiques.component.css'
})
export class InfosPratiquesComponent implements OnInit {
  private readonly infoService = inject(InfoPratiqueService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // État du catalogue
  infos: InfoPratique[] = [];
  filteredInfos: InfoPratique[] = [];
  activeCategory: string = 'ALL';
  isLoading: boolean = false;
  isEditing: boolean = false;
  isSubmitting: boolean = false;
  isUploadingImage: boolean = false;
  isDragging: boolean = false;

  // Notifications
  successMessage: string = '';
  errorMessage: string = '';

  // Formulaire d'édition
  editingId: number | string | null = null;
  titre: string = '';
  categorie: string = 'VISAS';
  description: string = '';
  conseils: string = '';
  coordonnees: string = '';
  badge: string = '';
  badgeColor: string = '#C53030';
  icon: string = 'badge';
  imageUrl: string = '';
  ordreAffichage: number = 1;
  publie: boolean = true;

  // Catégories prédéfinies du guide pratique
  readonly categoriesDisponibles = [
    { code: 'ALL', label: 'Toutes les catégories' },
    { code: 'VISAS', label: 'Visas & Formalités' },
    { code: 'SANTE', label: 'Santé & Vaccinations' },
    { code: 'DEVISES', label: 'Devises & Paiements' },
    { code: 'CLIMAT', label: 'Climat & Saisons' },
    { code: 'URGENCES', label: 'Numéros d\'Urgence' }
  ];

  // Palette de couleurs pour badges
  readonly couleursBadge = [
    { label: 'Rouge (Urgent/Obligatoire)', hex: '#C53030' },
    { label: 'Orange (Attention/Exigé)', hex: '#DD6B20' },
    { label: 'Vert (Monnaie/Conseillé)', hex: '#2E7D32' },
    { label: 'Bleu (Météo/Information)', hex: '#3182CE' },
    { label: 'Émeraude Mali (Standard)', hex: '#0E8F76' },
    { label: 'Violet (Culture/Spécifique)', hex: '#805AD5' }
  ];

  // Icônes représentatives
  readonly iconesDisponibles = [
    { code: 'badge', label: 'Passeport / Formalités' },
    { code: 'medical_services', label: 'Santé / Médical' },
    { code: 'payments', label: 'Paiement / Monnaie' },
    { code: 'wb_sunny', label: 'Météo / Soleil' },
    { code: 'contact_phone', label: 'Téléphone / Secours' },
    { code: 'info', label: 'Information générale' }
  ];

  ngOnInit(): void {
    this.loadInfos();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/infos-pratiques/ajouter')) {
      if (!this.isEditing) {
        this.startAdd(false);
      }
    } else if (!this.editingId && this.isEditing) {
      this.isEditing = false;
    }
  }

  /**
   * Charge la totalité des rubriques d'informations pratiques.
   */
  loadInfos(): void {
    this.isLoading = true;
    this.infoService.getAllInfosPratiques().subscribe({
      next: (data) => {
        this.infos = data;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement infos pratiques:', err);
        this.isLoading = false;
        this.showNotification('Impossible de charger les informations pratiques.', true);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Filtre la liste affichée par catégorie active.
   */
  filterByCategory(catCode: string): void {
    this.activeCategory = catCode;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeCategory === 'ALL') {
      this.filteredInfos = [...this.infos];
    } else {
      this.filteredInfos = this.infos.filter(
        (i) => (i.categorie || '').toUpperCase() === this.activeCategory.toUpperCase()
      );
    }
  }

  /**
   * Initialise le formulaire en mode création.
   */
  startAdd(navigate: boolean = true): void {
    this.editingId = null;
    this.titre = '';
    this.categorie = this.activeCategory !== 'ALL' ? this.activeCategory : 'VISAS';
    this.description = '';
    this.conseils = '';
    this.coordonnees = '';
    this.badge = '';
    this.badgeColor = '#C53030';
    this.icon = 'badge';
    this.imageUrl = '';
    this.ordreAffichage = this.infos.length + 1;
    this.publie = true;
    this.isEditing = true;

    if (navigate) {
      this.router.navigate(['/infos-pratiques/ajouter']);
    }
  }

  /**
   * Ouvre une fiche existante en édition.
   */
  onEdit(info: InfoPratique): void {
    this.editingId = info.id ?? null;
    this.titre = info.titre || '';
    this.categorie = (info.categorie || 'VISAS').toUpperCase();
    this.description = info.description || '';
    this.conseils = info.conseils || '';
    this.coordonnees = info.coordonnees || '';
    this.badge = info.badge || '';
    this.badgeColor = info.badgeColor || '#0E8F76';
    this.icon = info.icon || 'info';
    this.imageUrl = info.imageUrl || '';
    this.ordreAffichage = info.ordreAffichage ?? info.ordre ?? 1;
    this.publie = info.publie ?? info.estPublie ?? true;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Bascule le statut publié / brouillon.
   */
  onTogglePublication(info: InfoPratique, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const id = info.id;
    if (!id) return;

    this.infoService.togglePublication(id).subscribe({
      next: (updated) => {
        info.publie = updated.publie;
        info.estPublie = updated.estPublie;
        this.showNotification(`Statut de "${info.titre}" mis à jour (${info.publie ? 'Publié' : 'Brouillon'}).`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.showNotification('Erreur lors du changement de publication.', true);
      }
    });
  }

  /**
   * Supprime une fiche pratique.
   */
  async onDelete(info: InfoPratique): Promise<void> {
    const id = info.id;
    if (!id) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la rubrique pratique',
      message: `Confirmez-vous la suppression de la rubrique "${info.titre}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.infoService.deleteInfoPratique(id).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Rubrique "${info.titre}" supprimée.`);
        this.loadInfos();
      },
      error: () => {
        this.dialogService.toastError('Erreur lors de la suppression.');
      }
    });
  }

  /**
   * Gestion du glisser-déposer et téléversement Supabase.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.processFile(input.files[0]);
      input.value = '';
    }
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.showNotification('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).', true);
      return;
    }

    this.isUploadingImage = true;
    this.uploadService.uploadImage(file, 'infos_pratiques', 'INFO_PRATIQUE', this.editingId ?? undefined).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isUploadingImage = false;
        this.showNotification('Illustration téléversée sur Supabase Storage.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur téléversement Supabase:', err);
        this.isUploadingImage = false;
        this.showNotification(err.message || 'Erreur lors du téléversement de l\'image.', true);
        this.cdr.markForCheck();
      }
    });
  }

  removeImage(): void {
    this.imageUrl = '';
    this.cdr.markForCheck();
  }

  /**
   * Soumission du formulaire.
   */
  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.isUploadingImage) {
      this.showNotification('Veuillez patienter pendant le téléversement de l\'image...', true);
      return;
    }

    const titreStr = (this.titre || '').trim();
    if (!titreStr) {
      this.showNotification('Le titre de l\'information pratique est obligatoire.', true);
      return;
    }

    const catStr = (this.categorie || '').trim();
    if (!catStr) {
      this.showNotification('La catégorie est obligatoire.', true);
      return;
    }

    this.isSubmitting = true;

    const payload: Partial<InfoPratique> = {
      titre: titreStr,
      categorie: catStr.toUpperCase(),
      description: (this.description || '').trim(),
      conseils: (this.conseils || '').trim(),
      coordonnees: (this.coordonnees || '').trim(),
      badge: (this.badge || '').trim(),
      badgeColor: (this.badgeColor || '#0E8F76').trim(),
      icon: (this.icon || 'info').trim(),
      imageUrl: (this.imageUrl || '').trim(),
      ordreAffichage: Number(this.ordreAffichage) || 0,
      publie: this.publie
    };

    if (this.editingId !== null) {
      this.infoService.updateInfoPratique(this.editingId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Information pratique "${payload.titre}" mise à jour.`);
          this.resetForm();
          this.loadInfos();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur mise à jour info pratique:', err);
          this.isSubmitting = false;
          this.showNotification('Erreur lors de la mise à jour.', true);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.infoService.createInfoPratique(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Information pratique "${payload.titre}" ajoutée.`);
          this.resetForm();
          this.loadInfos();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur création info pratique:', err);
          this.isSubmitting = false;
          this.showNotification('Erreur lors de l\'ajout de l\'information pratique.', true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Réinitialise le formulaire et retourne au listing.
   */
  resetForm(): void {
    this.editingId = null;
    this.titre = '';
    this.categorie = 'VISAS';
    this.description = '';
    this.conseils = '';
    this.coordonnees = '';
    this.badge = '';
    this.badgeColor = '#C53030';
    this.icon = 'badge';
    this.imageUrl = '';
    this.ordreAffichage = 1;
    this.publie = true;
    this.isEditing = false;
    this.isSubmitting = false;
    this.router.navigate(['/infos-pratiques']);
    this.cdr.detectChanges();
  }

  private showNotification(msg: string, isError: boolean = false): void {
    if (isError) {
      this.errorMessage = msg;
      setTimeout(() => (this.errorMessage = ''), 4500);
    } else {
      this.successMessage = msg;
      setTimeout(() => (this.successMessage = ''), 3500);
    }
    this.cdr.markForCheck();
  }
}

