import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { EthnieService } from '../../services/ethnie.service';
import { UploadService } from '../../services/upload.service';
import { Ethnie } from '../../models/ethnie.model';

@Component({
  selector: 'app-ethnies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ethnies.component.html',
  styleUrl: './ethnies.component.css'
})
export class EthniesComponent implements OnInit {
  private readonly ethnieService = inject(EthnieService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ethnies: Ethnie[] = [];
  nom: string = '';
  langues: string = '';
  region: string = '';
  population: string = '';
  description: string = '';
  imageUrl: string = '';
  images: string[] = [];
  isUploadingImage: boolean = false;
  isDragging: boolean = false;
  selectedFileName: string = '';
  selectedFileSize: string = '';
  editingEthnieId: number | string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadEthnies();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/ethnies/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingEthnieId && this.isEditing) {
      this.isEditing = false;
    }
  }

  startAdd(): void {
    this.editingEthnieId = null;
    this.nom = '';
    this.langues = '';
    this.region = '';
    this.population = '';
    this.description = '';
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.isEditing = true;
    this.router.navigate(['/ethnies/ajouter']);
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

    this.uploadService.uploadMultipleImages(files, 'ethnies', 'ETHNIE', this.editingEthnieId ?? undefined).subscribe({
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

  loadEthnies(): void {
    this.isLoading = true;
    this.ethnieService.getEthnies().subscribe({
      next: (data) => {
        this.ethnies = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.isUploadingImage) {
      this.showNotification("Veuillez patienter pendant le téléversement de l'image...", true);
      return;
    }

    const nomStr = (this.nom || '').trim();
    if (!nomStr) {
      this.showNotification("Veuillez saisir le nom de l'ethnie.", true);
      return;
    }

    const defaultEthnieImage = 'https://dzhqwkpwaljqsjwoqvso.supabase.co/storage/v1/object/public/maliexplorer-media/ethnies/db279909-85b5-4af8-844c-b6bc74ce4337_A_Visit_to_the_Dogon_Tribe_High_in_the_Bandiagara___Travel_Photographs_By_Rosemary_Sheel.jpg';
    let primaryUrl = this.images.length > 0 ? this.images[0] : (this.imageUrl || '').trim();
    if (!primaryUrl) {
      primaryUrl = defaultEthnieImage;
    }

    const payload: Ethnie = {
      nom: nomStr,
      langues: (this.langues || '').trim(),
      region: (this.region || '').trim(),
      population: (this.population || '').trim(),
      imageUrl: primaryUrl,
      images: this.images.length > 0 ? this.images : [primaryUrl],
      description: (this.description || '').trim()
    };

    if (this.editingEthnieId !== null) {
      this.ethnieService.updateEthnie(this.editingEthnieId, payload).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${payload.nom}" mise à jour.`);
          this.resetForm();
          this.loadEthnies();
        },
        error: () => this.showNotification('Erreur de mise à jour.', true)
      });
    } else {
      this.ethnieService.createEthnie(payload).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${payload.nom}" ajoutée.`);
          this.resetForm();
          this.loadEthnies();
        },
        error: () => this.showNotification("Erreur lors de l'ajout.", true)
      });
    }
  }

  onEdit(ethnie: Ethnie): void {
    this.editingEthnieId = ethnie.id ?? null;
    this.nom = ethnie.nom || '';
    this.langues = ethnie.langues || '';
    this.region = ethnie.region || ethnie.ville || '';
    this.population = (ethnie as any).population || '';
    this.imageUrl = (ethnie as any).imageUrl || '';
    if (ethnie.images && ethnie.images.length > 0) {
      this.images = [...ethnie.images];
    } else if (this.imageUrl) {
      this.images = this.imageUrl.split(',').map((u) => u.trim()).filter(Boolean);
    } else {
      this.images = [];
    }
    this.selectedFileName = this.images.length > 0 ? `${this.images.length} image(s)` : '';
    this.selectedFileSize = '';
    this.description = ethnie.description || '';
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(ethnie: Ethnie): void {
    if (!ethnie.id) return;
    if (window.confirm(`Supprimer l'ethnie "${ethnie.nom}" ?`)) {
      this.ethnieService.deleteEthnie(ethnie.id).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${ethnie.nom}" supprimée.`);
          this.loadEthnies();
        },
        error: () => this.showNotification('Erreur de suppression.', true)
      });
    }
  }

  resetForm(): void {
    this.nom = '';
    this.langues = '';
    this.region = '';
    this.population = '';
    this.imageUrl = '';
    this.images = [];
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.description = '';
    this.editingEthnieId = null;
    this.isEditing = false;
    this.router.navigate(['/ethnies']);
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
