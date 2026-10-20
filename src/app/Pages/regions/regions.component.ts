import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { RegionService } from '../../services/region.service';
import { UploadService } from '../../services/upload.service';
import { Region } from '../../models/region.model';

@Component({
  selector: 'app-regions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './regions.component.html',
  styleUrl: './regions.component.css'
})
export class RegionsComponent implements OnInit {
  private readonly regionService = inject(RegionService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  regions: Region[] = [];
  editingRegionId: number | string | null = null;
  isEditing: boolean = false;
  isSubmitting: boolean = false;
  isLoading: boolean = false;
  isUploading: boolean = false;
  isDragging: boolean = false;

  // Champs de saisie du formulaire de région
  regionName: string = '';
  chefLieu: string = '';
  population: string = '';
  superficie: string = '';
  description: string = '';
  imageUrl: string = '';

  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
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
    if (url.includes('/regions/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingRegionId && this.isEditing) {
      this.isEditing = false;
    }
  }

  startAdd(): void {
    this.resetForm();
    this.isEditing = true;
    this.router.navigate(['/regions/ajouter']);
  }

  loadRegions(): void {
    this.isLoading = true;
    this.regionService.getRegions().subscribe({
      next: (data) => {
        this.regions = data || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement régions :', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /// Gestionnaire d'upload photo vers Supabase Storage
  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.uploadRegionImage(input.files[0]);
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
      this.uploadRegionImage(event.dataTransfer.files[0]);
    }
  }

  private uploadRegionImage(file: File): void {
    this.isUploading = true;
    this.uploadService.uploadImage(file, 'regions', 'REGION').subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isUploading = false;
        this.showNotification('Photo de la région téléversée vers Supabase Storage avec succès.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploading = false;
        this.showNotification(err.message || 'Échec du téléversement de la photo.', true);
        this.cdr.markForCheck();
      }
    });
  }

  removeImage(): void {
    this.imageUrl = '';
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.isUploading) {
      this.showNotification('Veuillez patienter pendant la fin du téléversement de la photo...', true);
      return;
    }

    const trimmedName = this.regionName.trim();
    if (!trimmedName) {
      this.showNotification('Veuillez saisir le nom de la région.', true);
      return;
    }

    this.isSubmitting = true;

    // Nettoyage et formatage du nombre d'habitants
    let popNumber: number | undefined = undefined;
    if (this.population) {
      const cleanDigits = this.population.toString().replace(/\D/g, '');
      if (cleanDigits) {
        popNumber = parseInt(cleanDigits, 10);
      }
    }

    const payload: Region & { nbreHbt?: number; description?: string } = {
      nom: trimmedName,
      chefLieu: this.chefLieu.trim() || undefined,
      superficie: this.superficie.trim() || undefined,
      description: this.description.trim() || undefined,
      imageUrl: this.imageUrl.trim() || undefined,
      population: popNumber,
      nbreHbt: popNumber
    };

    if (this.editingRegionId !== null) {
      this.regionService.updateRegion(this.editingRegionId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Région "${trimmedName}" mise à jour avec succès.`);
          this.resetForm();
          this.loadRegions();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur mise à jour région :', err);
          this.showNotification('Erreur lors de la mise à jour de la région.', true);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.regionService.createRegion(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Région "${trimmedName}" ajoutée avec succès.`);
          this.resetForm();
          this.loadRegions();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur ajout région :', err);
          this.showNotification("Erreur lors de l'ajout de la région.", true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  onEdit(region: Region): void {
    this.editingRegionId = region.id ?? (region as any).idRegion ?? null;
    this.regionName = region.nom || '';
    this.chefLieu = region.chefLieu || '';
    this.population = region.population != null ? String(region.population) : ((region as any).nbreHbt != null ? String((region as any).nbreHbt) : '');
    this.superficie = region.superficie || '';
    this.description = region.description || '';
    this.imageUrl = region.imageUrl || '';
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  onDelete(region: Region): void {
    const targetId = region.id ?? (region as any).idRegion;
    if (!targetId) return;
    const confirmDelete = window.confirm(`Voulez-vous vraiment supprimer la région "${region.nom}" ?`);
    if (confirmDelete) {
      this.regionService.deleteRegion(targetId).subscribe({
        next: () => {
          this.showNotification(`Région "${region.nom}" supprimée.`);
          this.loadRegions();
          this.cdr.detectChanges();
        },
        error: () => {
          this.showNotification('Erreur lors de la suppression.', true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  resetForm(): void {
    this.regionName = '';
    this.chefLieu = '';
    this.population = '';
    this.superficie = '';
    this.description = '';
    this.imageUrl = '';
    this.editingRegionId = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.isUploading = false;
    this.isDragging = false;
    this.router.navigate(['/regions']);
    this.cdr.detectChanges();
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
