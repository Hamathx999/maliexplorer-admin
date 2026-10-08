import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { VilleService } from '../../services/ville.service';
import { RegionService } from '../../services/region.service';
import { UploadService } from '../../services/upload.service';
import { Ville } from '../../models/ville.model';
import { Region } from '../../models/region.model';

@Component({
  selector: 'app-villes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './villes.component.html',
  styleUrl: './villes.component.css'
})
export class VillesComponent implements OnInit {
  private readonly villeService = inject(VilleService);
  private readonly regionService = inject(RegionService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  villes: Ville[] = [];
  regions: Region[] = [];
  nom: string = '';
  selectedRegion: string = '';
  population: string = '';
  description: string = '';
  cordonnees: string = '';
  imageUrl: string = '';
  images: string[] = [];
  isUploadingImage: boolean = false;
  isDragging: boolean = false;
  selectedFileName: string = '';
  selectedFileSize: string = '';
  editingVilleId: number | string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadVilles();
    this.loadRegions();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/villes/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingVilleId && this.isEditing) {
      this.isEditing = false;
    }
  }

  startAdd(): void {
    this.editingVilleId = null;
    this.nom = '';
    this.population = '';
    this.description = '';
    this.cordonnees = '';
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    if (this.regions.length > 0 && !this.selectedRegion) {
      this.selectedRegion = this.regions[0].nom;
    }
    this.isEditing = true;
    this.router.navigate(['/villes/ajouter']);
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
      this.showNotification('Veuillez sélectionner des fichiers images valides (JPG, PNG, WEBP).', true);
      return;
    }

    this.isUploadingImage = true;
    this.selectedFileName = `${files.length} image(s) en cours d'envoi...`;

    this.uploadService.uploadMultipleImages(files, 'villes', 'VILLE', this.editingVilleId ?? undefined).subscribe({
      next: (urls) => {
        urls.forEach((url) => {
          if (!this.images.includes(url)) {
            this.images.push(url);
          }
        });
        if (this.images.length > 0) {
          this.imageUrl = this.images[0];
        }
        this.isUploadingImage = false;
        this.selectedFileName = `${this.images.length} image(s) au total`;
        this.showNotification(`${urls.length} image(s) téléversée(s) avec succès.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur téléversement images:', err);
        this.isUploadingImage = false;
        this.showNotification(err.message || 'Erreur lors du téléversement.', true);
        this.cdr.markForCheck();
      }
    });
  }

  removeImageAtIndex(index: number): void {
    this.images.splice(index, 1);
    this.imageUrl = this.images.length > 0 ? this.images[0] : '';
    this.selectedFileName = this.images.length > 0 ? `${this.images.length} image(s)` : '';
    this.cdr.markForCheck();
  }

  setPrimaryImage(index: number): void {
    if (index > 0 && index < this.images.length) {
      const chosen = this.images.splice(index, 1)[0];
      this.images.unshift(chosen);
      this.imageUrl = this.images[0];
      this.showNotification('Image principale définie.');
      this.cdr.markForCheck();
    }
  }

  removeImage(): void {
    this.images = [];
    this.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
  }

  loadVilles(): void {
    this.isLoading = true;
    this.villeService.getVilles().subscribe({
      next: (data) => {
        this.villes = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadRegions(): void {
    this.regionService.getRegions().subscribe((regs) => {
      this.regions = regs;
      if (this.regions.length > 0 && !this.selectedRegion) {
        this.selectedRegion = this.regions[0].nom;
      }
      this.cdr.markForCheck();
    });
  }

  onSubmit(): void {
    if (this.isUploadingImage) {
      this.showNotification('Veuillez patienter pendant la fin du téléversement vers Supabase...', true);
      return;
    }

    const nomStr = (this.nom || '').trim();
    if (!nomStr) {
      this.showNotification('Veuillez saisir le nom de la ville.', true);
      return;
    }

    const foundReg = this.regions.find((r) => r.nom === this.selectedRegion);
    const pop = (this.population || '').trim();
    let primaryUrl = this.images.length > 0 ? this.images[0] : (this.imageUrl || '').trim();
    if (!primaryUrl) {
      primaryUrl = this.getCityFallbackImage(nomStr, this.selectedRegion);
    }
    const resolvedImages = this.images.length > 0 ? this.images : [primaryUrl];
    const payload: any = {
      nom: nomStr,
      region: this.selectedRegion || 'Mopti',
      population: pop,
      nbreHbt: pop,
      idRegion: foundReg?.id,
      regionId: foundReg?.id,
      cordonnees: (this.cordonnees || '').trim(),
      imageUrl: primaryUrl,
      images: resolvedImages,
      description: (this.description || '').trim()
    };

    if (this.editingVilleId !== null) {
      this.villeService.updateVille(this.editingVilleId, payload).subscribe({
        next: () => {
          this.showNotification(`Ville "${payload.nom}" mise à jour.`);
          this.resetForm();
          this.loadVilles();
        },
        error: () => this.showNotification('Erreur de mise à jour.', true)
      });
    } else {
      this.villeService.createVille(payload).subscribe({
        next: () => {
          this.showNotification(`Ville "${payload.nom}" ajoutée.`);
          this.resetForm();
          this.loadVilles();
        },
        error: () => this.showNotification("Erreur lors de l'ajout.", true)
      });
    }
  }

  onEdit(ville: Ville): void {
    this.editingVilleId = ville.id ?? null;
    this.nom = ville.nom;
    this.selectedRegion = ville.region;
    this.population = String(ville.population || '');
    this.cordonnees = (ville as any).cordonnees || '';
    this.imageUrl = (ville as any).imageUrl || '';
    if (ville.images && ville.images.length > 0) {
      this.images = [...ville.images];
    } else if (this.imageUrl) {
      this.images = this.imageUrl.split(',').map((u) => u.trim()).filter(Boolean);
    } else {
      this.images = [];
    }
    this.selectedFileName = this.images.length > 0 ? `${this.images.length} image(s)` : '';
    this.selectedFileSize = '';
    this.description = ville.description || '';
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(ville: Ville): void {
    if (!ville.id) return;
    if (window.confirm(`Supprimer la ville "${ville.nom}" ?`)) {
      this.villeService.deleteVille(ville.id).subscribe({
        next: () => {
          this.showNotification(`Ville "${ville.nom}" supprimée.`);
          this.loadVilles();
        },
        error: () => this.showNotification('Erreur de suppression.', true)
      });
    }
  }

  getCityFallbackImage(nom?: string, region?: string): string {
    const key = `${nom || ''} ${region || ''}`.toLowerCase().trim();
    if (key.includes('djenne') || key.includes('djenné')) {
      return 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600&auto=format&fit=crop&q=80';
    }
    if (key.includes('tombouctou')) {
      return 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80';
    }
    if (key.includes('mopti')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
    }
    if (key.includes('segou') || key.includes('ségou')) {
      return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&auto=format&fit=crop&q=80';
    }
    if (key.includes('sikasso')) {
      return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&auto=format&fit=crop&q=80';
  }

  getVilleImage(ville: Ville): string {
    if (ville.imageUrl && ville.imageUrl.trim()) {
      const first = ville.imageUrl.split(',')[0].trim();
      if (first) return first;
    }
    if (ville.images && ville.images.length > 0) {
      const first = ville.images[0].trim();
      if (first) return first;
    }
    return this.getCityFallbackImage(ville.nom, ville.region);
  }

  onImageError(event: Event, ville: Ville): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.getCityFallbackImage(ville.nom, ville.region);
    }
  }

  resetForm(): void {
    this.editingVilleId = null;
    this.nom = '';
    this.population = '';
    this.cordonnees = '';
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.description = '';
    this.isEditing = false;
    this.router.navigate(['/villes']);
  }

  private showNotification(msg: string, isError: boolean = false): void {
    if (isError) {
      this.errorMessage = msg;
      setTimeout(() => (this.errorMessage = ''), 4000);
    } else {
      this.successMessage = msg;
      setTimeout(() => (this.successMessage = ''), 3500);
    }
    this.cdr.markForCheck();
  }
}
