import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PlatService } from '../../services/plat.service';
import { IngredientService } from '../../services/ingredient.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { Plat } from '../../models/plat.model';
import { sanitizeImageUrl, splitImageUrls } from '../../utils/image-url.util';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-plats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plats.component.html',
  styleUrl: './plats.component.css'
})
export class PlatsComponent implements OnInit {
  private readonly platService = inject(PlatService);
  private readonly ingredientService = inject(IngredientService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  plats: Plat[] = [];
  filteredPlats: Plat[] = [];
  availableIngredients: Ingredient[] = [];
  selectedIngredientIds: number[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  imageUrl: string = '';
  images: string[] = [];
  isUploadingImage: boolean = false;
  isDragging: boolean = false;
  selectedFileName: string = '';
  selectedFileSize: string = '';

  isEditing: boolean = false;
  isSubmitting: boolean = false;
  editingPlat: Plat | null = null;
  formData: Partial<Plat> = {
    nom: '',
    ingredientPrincipal: '',
    ingredientIds: [],
    region: 'Nationale',
    tempsPreparation: '1h 30min',
    difficulte: 'Moyen',
    imageUrl: '',
    description: ''
  };

  ngOnInit(): void {
    this.loadPlats();
    this.loadIngredients();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  loadIngredients(): void {
    this.ingredientService.getIngredients().subscribe({
      next: (data) => {
        this.availableIngredients = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement ingrédients', err)
    });
  }

  isIngredientSelected(id?: number | string): boolean {
    if (!id) return false;
    return this.selectedIngredientIds.includes(Number(id));
  }

  toggleIngredient(ingredient: Ingredient): void {
    const id = Number(ingredient.id ?? ingredient.idIngredient);
    if (!id) return;
    const index = this.selectedIngredientIds.indexOf(id);
    if (index > -1) {
      this.selectedIngredientIds.splice(index, 1);
    } else {
      this.selectedIngredientIds.push(id);
    }
    this.syncIngredientPrincipal();
  }

  removeIngredient(id?: number | string): void {
    if (!id) return;
    this.selectedIngredientIds = this.selectedIngredientIds.filter((item) => item !== Number(id));
    this.syncIngredientPrincipal();
  }

  addIngredientFromSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = Number(target.value);
    if (val && !this.selectedIngredientIds.includes(val)) {
      this.selectedIngredientIds.push(val);
      this.syncIngredientPrincipal();
    }
    target.value = '';
  }

  getSelectedIngredientObjects(): Ingredient[] {
    return this.availableIngredients.filter((ing) => {
      const id = Number(ing.id ?? ing.idIngredient);
      return this.selectedIngredientIds.includes(id);
    });
  }

  private syncIngredientPrincipal(): void {
    const names = this.getSelectedIngredientObjects().map((ing) => ing.nom || ing.nomPlat || '');
    this.formData.ingredientPrincipal = names.join(', ');
    this.formData.ingredientIds = [...this.selectedIngredientIds];
  }

  private checkRoute(url: string): void {
    if (url.includes('/plats/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingPlat && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadPlats(): void {
    this.platService.getPlats().subscribe({
      next: (data) => {
        console.log(data);
        this.plats = data;
        this.filterPlats();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement plats', err)
    });
  }

  filterPlats(): void {
    this.filteredPlats = this.plats.filter((p) => {
      const matchSearch =
        !this.searchTerm ||
        p.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.ingredientPrincipal && p.ingredientPrincipal.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchRegion =
        this.selectedRegion === 'TOUTES' ||
        p.region?.toLowerCase() === this.selectedRegion.toLowerCase();

      return matchSearch && matchRegion;
    });
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.uploadFiles(input.files);
      input.value = '';
    }
  }

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
      this.uploadFiles(event.dataTransfer.files);
    }
  }

  private uploadFiles(fileList: FileList | File[]): void {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      this.dialogService.toastWarning('Veuillez sélectionner des fichiers images valides (JPG, PNG, WEBP).');
      return;
    }

    this.isUploadingImage = true;
    this.selectedFileName = `${files.length} image(s) en cours d'envoi...`;

    this.uploadService.uploadMultipleImages(files, 'plats', 'PLAT', this.editingPlat?.id ?? undefined).subscribe({
      next: (urls) => {
        urls.forEach((url) => {
          if (!this.images.includes(url)) {
            this.images.push(url);
          }
        });
        if (this.images.length > 0) {
          this.imageUrl = this.images[0];
          this.formData.imageUrl = this.imageUrl;
        }
        this.isUploadingImage = false;
        this.selectedFileName = `${this.images.length} image(s) au total`;
        this.dialogService.toastSuccess(`${urls.length} image(s) téléversée(s) avec succès.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur téléversement images plat:', err);
        this.isUploadingImage = false;
        this.dialogService.toastError(err.message || 'Erreur lors du téléversement des images.');
        this.cdr.markForCheck();
      }
    });
  }

  removeImageAtIndex(index: number): void {
    this.images.splice(index, 1);
    this.imageUrl = this.images.length > 0 ? this.images[0] : '';
    this.formData.imageUrl = this.imageUrl;
    this.selectedFileName = this.images.length > 0 ? `${this.images.length} image(s)` : '';
    this.cdr.markForCheck();
  }

  setPrimaryImage(index: number): void {
    if (index > 0 && index < this.images.length) {
      const chosen = this.images.splice(index, 1)[0];
      this.images.unshift(chosen);
      this.imageUrl = this.images[0];
      this.formData.imageUrl = this.imageUrl;
      this.cdr.markForCheck();
    }
  }

  removeImage(): void {
    this.images = [];
    this.imageUrl = '';
    this.formData.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
  }

  startAdd(): void {
    this.editingPlat = null;
    this.selectedIngredientIds = [];
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.formData = {
      nom: '',
      ingredientPrincipal: '',
      ingredientIds: [],
      region: 'Nationale',
      tempsPreparation: '1h 30min',
      difficulte: 'Moyen',
      imageUrl: '',
      description: ''
    };
    this.isEditing = true;
    this.router.navigate(['/plats/ajouter']);
  }

  startEdit(plat: Plat): void {
    this.editingPlat = plat;
    this.selectedIngredientIds = [];
    this.imageUrl = sanitizeImageUrl(plat.imageUrl || '');
    if (plat.images && plat.images.length > 0) {
      this.images = plat.images.map((u) => sanitizeImageUrl(u)).filter(Boolean);
    } else if (this.imageUrl) {
      this.images = splitImageUrls(this.imageUrl);
    } else {
      this.images = [];
    }
    this.selectedFileName = this.images.length > 0 ? `${this.images.length} image(s)` : '';
    this.selectedFileSize = '';

    if (plat.ingredientIds && plat.ingredientIds.length > 0) {
      this.selectedIngredientIds = plat.ingredientIds.map(Number);
    } else if (plat.ingredientPrincipal || (plat.ingredients && plat.ingredients.length > 0)) {
      const names = (plat.ingredients && plat.ingredients.length > 0)
        ? plat.ingredients
        : (plat.ingredientPrincipal ? plat.ingredientPrincipal.split(',').map((s) => s.trim()) : []);
      this.availableIngredients.forEach((ing) => {
        const ingName = (ing.nom || ing.nomPlat || '').toLowerCase().trim();
        if (names.some((n) => n.toLowerCase().trim() === ingName)) {
          const id = Number(ing.id ?? ing.idIngredient);
          if (id && !this.selectedIngredientIds.includes(id)) {
            this.selectedIngredientIds.push(id);
          }
        }
      });
    }

    this.formData = {
      ...plat,
      imageUrl: this.imageUrl,
      ingredientIds: [...this.selectedIngredientIds]
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
    this.router.navigate(['/plats']);
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.formData = {
      nom: '',
      ingredientPrincipal: '',
      ingredientIds: [],
      region: 'Nationale',
      tempsPreparation: '1h 30min',
      difficulte: 'Moyen',
      imageUrl: '',
      description: ''
    };
    this.editingPlat = null;
    this.selectedIngredientIds = [];
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.isEditing = false;
    this.isSubmitting = false;
    this.isUploadingImage = false;
    this.isDragging = false;
    this.cdr.detectChanges();
  }

  getPlatFallbackImage(nomPlat: string): string {
    const lower = (nomPlat || '').toLowerCase();
    if (lower.includes('tiga') || lower.includes('arachide')) {
      return '/assets/images/plats/tiguadegue_na.jpeg';
    } else if (lower.includes('saka')) {
      return '/assets/images/plats/sakasaka.jpeg';
    } else if (lower.includes('fakoye')) {
      return '/assets/images/plats/fakoye.jpeg';
    } else if (lower.includes('tô') || lower.includes('to ') || lower === 'to' || lower.includes('gombo')) {
      return '/assets/images/plats/to.jpeg';
    } else if (lower.includes('zaamin') || lower.includes('gras')) {
      return '/assets/images/plats/zaamin.jpeg';
    } else if (lower.includes('widjila')) {
      return '/assets/images/plats/widjila.jpeg';
    }
    return '/assets/images/plats/tiguadegue_na.jpeg';
  }

  getPlatFallbackIngredients(nomPlat: string): string[] {
    const lower = (nomPlat || '').toLowerCase();
    if (lower.includes('tiga') || lower.includes('arachide')) {
      return ['Pâte d\'arachide', 'Viande / Poulet', 'Tomates fraîches', 'Patates douces'];
    } else if (lower.includes('fakoye')) {
      return ['Feuilles de corète (Fakoye)', 'Viande de mouton', 'Épices de Tombouctou', 'Beurre de karité'];
    } else if (lower.includes('tô') || lower.includes('to ') || lower === 'to' || lower.includes('gombo')) {
      return ['Farine de mil / maïs', 'Gombo frais / séché', 'Potasse', 'Poisson séché'];
    } else if (lower.includes('zaamin') || lower.includes('gras')) {
      return ['Riz parfumé', 'Bouillon de viande', 'Légumes du potager', 'Oignons caramélisés'];
    } else if (lower.includes('widjila')) {
      return ['Pains vapeur traditionnels', 'Sauce tomate mijotée', 'Viande de mouton'];
    } else if (lower.includes('saka')) {
      return ['Feuilles de manioc pilées', 'Poisson fumé', 'Pâte d\'arachide', 'Huile de palme'];
    }
    return ['Épices traditionnelles', 'Légumes frais'];
  }

  getPlatImage(plat: Plat): string {
    const archwayFallback = '1a4120a4-11f1-4850-833f-19bd89ea6639_ville_de_tombouctou.jpg';
    if (plat.imageUrl && plat.imageUrl.trim() && !plat.imageUrl.includes(archwayFallback)) {
      const list = splitImageUrls(plat.imageUrl);
      if (list.length > 0) return list[0];
    }
    if (plat.images && plat.images.length > 0 && plat.images[0] && !plat.images[0].includes(archwayFallback)) {
      const first = sanitizeImageUrl(plat.images[0]);
      if (first) return first;
    }
    return this.getPlatFallbackImage(plat.nom);
  }

  savePlat(): void {
    if (this.isSubmitting) return;

    if (this.isUploadingImage) {
      this.dialogService.toastWarning('Veuillez patienter pendant le téléversement de l\'image...');
      return;
    }

    if (!this.formData.nom || !this.formData.nom.trim()) {
      this.dialogService.toastWarning('Veuillez renseigner le nom du plat.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.syncIngredientPrincipal();

    let primaryUrl = this.images.length > 0 ? this.images[0] : (this.imageUrl || this.formData.imageUrl || '').trim();
    if (!primaryUrl || primaryUrl.includes('1a4120a4-11f1-4850-833f-19bd89ea6639_ville_de_tombouctou.jpg')) {
      primaryUrl = this.getPlatFallbackImage(this.formData.nom);
    }

    const imagesList = this.images.length > 0 ? this.images : [primaryUrl];

    const platToSave: Plat = {
      ...this.formData,
      nom: this.formData.nom.trim(),
      description: this.formData.description?.trim() || '',
      imageUrl: primaryUrl,
      images: imagesList,
      ingredientPrincipal: this.formData.ingredientPrincipal || '',
      ingredientIds: [...this.selectedIngredientIds],
      ingredients: this.getSelectedIngredientObjects().map((i) => i.nom || i.nomPlat || '')
    } as Plat;

    const editingId = this.editingPlat?.id ?? (this.editingPlat as any)?.idPlat ?? this.formData?.id ?? (this.formData as any)?.idPlat;

    if (editingId) {
      this.platService.updatePlat(editingId, platToSave).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          const updatedId = updated.id ?? (updated as any).idPlat ?? editingId;
          const idx = this.plats.findIndex((p) => String(p.id ?? (p as any).idPlat) === String(updatedId));
          if (idx !== -1) {
            this.plats[idx] = { ...updated, id: updatedId };
          } else {
            this.loadPlats();
          }
          this.filterPlats();
          this.cancelEdit();
          this.dialogService.toastSuccess(`Plat "${platToSave.nom}" modifié avec succès !`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur modification plat', err);
          this.dialogService.toastError('Erreur lors de la modification du plat.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.platService.createPlat(platToSave).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.plats.unshift(created);
          this.filterPlats();
          this.cancelEdit();
          this.dialogService.toastSuccess(`Plat "${platToSave.nom}" ajouté avec succès !`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur création plat', err);
          this.dialogService.toastError('Erreur lors de la création du plat.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  async deletePlat(plat: Plat): Promise<void> {
    const platId = plat?.id ?? (plat as any)?.idPlat;
    if (!platId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer le plat traditionnel',
      message: `Confirmez-vous la suppression du plat traditionnel "${plat.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.platService.deletePlat(platId).subscribe({
      next: () => {
        this.plats = this.plats.filter((p) => String(p.id ?? (p as any).idPlat) !== String(platId));
        this.filterPlats();
        this.dialogService.toastSuccess(`Le plat "${plat.nom}" a été supprimé avec succès.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur suppression plat', err);
        this.dialogService.toastError('Impossible de supprimer le plat.');
        this.cdr.detectChanges();
      }
    });
  }
}
