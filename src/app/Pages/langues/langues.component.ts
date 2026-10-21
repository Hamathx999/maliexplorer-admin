import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { LangueService } from '../../services/langue.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { LangueNationale, LexiqueItem } from '../../models/langue.model';

/**
 * Composant de gestion et d'administration des langues nationales du Mali.
 * Prend en charge l'affichage du catalogue, l'ajout, la modification, la suppression,
 * la publication et l'édition granulaire du lexique d'expressions usuelles.
 */
@Component({
  selector: 'app-langues',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './langues.component.html',
  styleUrl: './langues.component.css'
})
export class LanguesComponent implements OnInit {
  private readonly langueService = inject(LangueService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // État du catalogue
  langues: LangueNationale[] = [];
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
  nom: string = '';
  nomLocal: string = '';
  locuteurs: string = '';
  regions: string = '';
  description: string = '';
  imageUrl: string = '';
  ordreAffichage: number = 1;
  publie: boolean = true;

  // Gestion du lexique
  lexiqueItems: LexiqueItem[] = [];
  newMot: string = '';
  newPhonetique: string = '';
  newTraduction: string = '';
  newCategorie: string = 'Salutations';

  // Catégories prédéfinies pour les expressions
  readonly categoriesLexique: string[] = [
    'Salutations',
    'Politesse & Respect',
    'Vie quotidienne',
    'Nombres & Marchandage',
    'Urgences & Santé',
    'Orientation & Déplacements',
    'Autre'
  ];

  ngOnInit(): void {
    this.loadLangues();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/langues/ajouter')) {
      if (!this.isEditing) {
        this.startAdd(false);
      }
    } else if (!this.editingId && this.isEditing) {
      this.isEditing = false;
    }
  }

  /**
   * Charge la liste complète des langues depuis le backend Spring Boot.
   */
  loadLangues(): void {
    this.isLoading = true;
    this.langueService.getAllLangues().subscribe({
      next: (data) => {
        this.langues = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement langues:', err);
        this.isLoading = false;
        this.showNotification('Impossible de charger les langues nationales.', true);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Initialise le formulaire en mode création.
   */
  startAdd(navigate: boolean = true): void {
    this.editingId = null;
    this.nom = '';
    this.nomLocal = '';
    this.locuteurs = '';
    this.regions = '';
    this.description = '';
    this.imageUrl = '';
    this.ordreAffichage = this.langues.length + 1;
    this.publie = true;
    this.lexiqueItems = [];
    this.resetNewLexiqueItem();
    this.isEditing = true;

    if (navigate) {
      this.router.navigate(['/langues/ajouter']);
    }
  }

  /**
   * Ouvre une langue existante pour modification.
   */
  onEdit(langue: LangueNationale): void {
    this.editingId = langue.id ?? null;
    this.nom = langue.nom || '';
    this.nomLocal = langue.nomLocal || '';
    this.locuteurs = langue.locuteurs || '';
    this.regions = langue.regions || '';
    this.description = langue.description || '';
    this.imageUrl = langue.imageUrl || '';
    this.ordreAffichage = langue.ordreAffichage ?? langue.ordre ?? 1;
    this.publie = langue.publie ?? langue.estPublie ?? true;

    // Décodage du lexique
    if (Array.isArray(langue.lexique) && langue.lexique.length > 0) {
      this.lexiqueItems = [...langue.lexique];
    } else if (langue.lexiqueJson) {
      try {
        const parsed = JSON.parse(langue.lexiqueJson);
        this.lexiqueItems = Array.isArray(parsed) ? parsed : [];
      } catch {
        this.lexiqueItems = [];
      }
    } else {
      this.lexiqueItems = [];
    }

    this.resetNewLexiqueItem();
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Bascule l'état de publication d'une langue (publié / brouillon).
   */
  onTogglePublication(langue: LangueNationale, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const id = langue.id;
    if (!id) return;

    this.langueService.togglePublication(id).subscribe({
      next: (updated) => {
        langue.publie = updated.publie;
        langue.estPublie = updated.estPublie;
        this.showNotification(`Statut de "${langue.nom}" mis à jour (${langue.publie ? 'Publié' : 'Brouillon'}).`);
        this.cdr.markForCheck();
      },
      error: () => {
        this.showNotification('Erreur lors du changement de publication.', true);
      }
    });
  }

  /**
   * Supprime une langue nationale après confirmation.
   */
  async onDelete(langue: LangueNationale): Promise<void> {
    const id = langue.id;
    if (!id) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la langue nationale',
      message: `Confirmez-vous la suppression de la langue "${langue.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.langueService.deleteLangue(id).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Langue "${langue.nom}" supprimée.`);
        this.loadLangues();
      },
      error: () => {
        this.dialogService.toastError('Erreur lors de la suppression.');
      }
    });
  }

  /**
   * Ajoute un élément au tableau lexique en cours de saisie.
   */
  addLexiqueItem(): void {
    const mot = (this.newMot || '').trim();
    const trad = (this.newTraduction || '').trim();

    if (!mot || !trad) {
      this.showNotification('Veuillez renseigner au minimum le mot en langue nationale et sa traduction.', true);
      return;
    }

    this.lexiqueItems.push({
      mot: mot,
      phonetique: (this.newPhonetique || '').trim(),
      traduction: trad,
      categorie: this.newCategorie || 'Salutations'
    });

    this.resetNewLexiqueItem();
    this.cdr.markForCheck();
  }

  /**
   * Supprime une entrée du lexique.
   */
  removeLexiqueItem(index: number): void {
    if (index >= 0 && index < this.lexiqueItems.length) {
      this.lexiqueItems.splice(index, 1);
      this.cdr.markForCheck();
    }
  }

  private resetNewLexiqueItem(): void {
    this.newMot = '';
    this.newPhonetique = '';
    this.newTraduction = '';
    this.newCategorie = 'Salutations';
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
    this.uploadService.uploadImage(file, 'langues', 'LANGUE', this.editingId ?? undefined).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isUploadingImage = false;
        this.showNotification('Illustration téléversée avec succès sur Supabase.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur upload Supabase:', err);
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
   * Soumission du formulaire (création ou mise à jour).
   */
  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.isUploadingImage) {
      this.showNotification('Veuillez patienter pendant le téléversement de l\'image...', true);
      return;
    }

    const nomStr = (this.nom || '').trim();
    if (!nomStr) {
      this.showNotification('Le nom officiel de la langue est obligatoire.', true);
      return;
    }

    this.isSubmitting = true;

    const payload: Partial<LangueNationale> = {
      nom: nomStr,
      nomLocal: (this.nomLocal || '').trim(),
      locuteurs: (this.locuteurs || '').trim(),
      regions: (this.regions || '').trim(),
      description: (this.description || '').trim(),
      imageUrl: (this.imageUrl || '').trim(),
      ordreAffichage: Number(this.ordreAffichage) || 0,
      publie: this.publie,
      lexique: this.lexiqueItems,
      lexiqueJson: JSON.stringify(this.lexiqueItems)
    };

    if (this.editingId !== null) {
      this.langueService.updateLangue(this.editingId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Langue "${payload.nom}" mise à jour avec succès.`);
          this.resetForm();
          this.loadLangues();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur mise à jour langue:', err);
          this.isSubmitting = false;
          this.showNotification('Erreur lors de la mise à jour de la langue.', true);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.langueService.createLangue(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Langue "${payload.nom}" ajoutée avec succès.`);
          this.resetForm();
          this.loadLangues();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur création langue:', err);
          this.isSubmitting = false;
          this.showNotification('Erreur lors de l\'ajout de la langue.', true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Réinitialise le formulaire et retourne à la vue catalogue.
   */
  resetForm(): void {
    this.editingId = null;
    this.nom = '';
    this.nomLocal = '';
    this.locuteurs = '';
    this.regions = '';
    this.description = '';
    this.imageUrl = '';
    this.ordreAffichage = 1;
    this.publie = true;
    this.lexiqueItems = [];
    this.resetNewLexiqueItem();
    this.isEditing = false;
    this.isSubmitting = false;
    this.router.navigate(['/langues']);
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

