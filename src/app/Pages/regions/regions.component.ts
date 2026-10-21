import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { RegionService } from '../../services/region.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
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
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly SUPABASE_BASE =
    'https://dzhqwkpwaljqsjwoqvso.supabase.co/storage/v1/object/public/maliexplorer-media';

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
  latitude: number | null = null;
  longitude: number | null = null;
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

  formatPopulation(region: Region): string {
    const raw = region.population ?? region.nbreHbt;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return '—';
    }
    const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/\D/g, ''));
    if (!isNaN(num) && num > 0) {
      return num.toLocaleString('fr-FR') + ' hab.';
    }
    return String(raw);
  }

  formatCoordinates(region: Region): string {
    if (region.latitude !== null && region.latitude !== undefined &&
        region.longitude !== null && region.longitude !== undefined) {
      const lat = Number(region.latitude);
      const lng = Number(region.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lngDir = lng >= 0 ? 'E' : 'O';
        return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
      }
    }
    return '—';
  }

  getRegionFallbackImage(nom?: string, chefLieu?: string): string {
    const key = `${nom || ''} ${chefLieu || ''}`.toLowerCase();
    if (key.includes('bamako')) return `${RegionsComponent.SUPABASE_BASE}/villes/72e5bb3b-0144-4ad7-aea5-0eb6d4b2e3f5_Bamako.jpg`;
    if (key.includes('kayes')) return `${RegionsComponent.SUPABASE_BASE}/villes/a74e7a57-4181-4298-b98a-bf3c59702646_Fleuve_S_n_gal_Kayes_Mali.jpeg`;
    if (key.includes('koulikoro')) return `${RegionsComponent.SUPABASE_BASE}/villes/910921e0-844f-4af7-b5dd-5aab12fcbaef_vestibule-koulikoro.jpg`;
    if (key.includes('sikasso')) return `${RegionsComponent.SUPABASE_BASE}/villes/2ba6d709-eafa-4d39-929d-61fbcf2d2bee_Le-Mamelon-de-Sikasso-Sindebou-_StudioTamani.jpg`;
    if (key.includes('segou') || key.includes('ségou')) return `${RegionsComponent.SUPABASE_BASE}/villes/046acd3d-6899-4076-b662-2502cbbda963_Segou__Mali___.jpeg`;
    if (key.includes('mopti')) return `${RegionsComponent.SUPABASE_BASE}/villes/d35072d2-51f7-4dc5-b906-f1199b4d2fa7_Mopti__Mali.jpeg`;
    if (key.includes('tombouctou')) return `${RegionsComponent.SUPABASE_BASE}/villes/3984e765-781e-4966-9c04-90b19fd64403_deuxieme_imagehome.jpeg`;
    if (key.includes('gao')) return `${RegionsComponent.SUPABASE_BASE}/villes/Gao1.jpg`;
    if (key.includes('kidal')) return `${RegionsComponent.SUPABASE_BASE}/villes/Kidal1.jpg`;
    if (key.includes('taoudeni') || key.includes('taoudénit')) return `${RegionsComponent.SUPABASE_BASE}/villes/Taoudeni1.JPG`;
    if (key.includes('menaka') || key.includes('ménaka')) return `${RegionsComponent.SUPABASE_BASE}/villes/Menaka1.jpg`;
    if (key.includes('koutiala')) return `${RegionsComponent.SUPABASE_BASE}/villes/2e0e6bf5-0023-494b-9157-f24aa881512b_koutiala.jpeg`;
    if (key.includes('san')) return `${RegionsComponent.SUPABASE_BASE}/villes/4aac1e77-f062-4bf8-8d8f-9b8ec39e1df0_san_sanke-mon.jpg`;
    if (key.includes('kenieba') || key.includes('kéniéba')) return `${RegionsComponent.SUPABASE_BASE}/villes/20c147b6-b759-4b58-b974-3c4611f2b1cb_kenieba.jpeg`;
    if (key.includes('kita')) return `${RegionsComponent.SUPABASE_BASE}/villes/8a2b87e9-7ef4-4298-8698-ac341176f1ce_kita.jpeg`;
    if (key.includes('bandiagara')) return `${RegionsComponent.SUPABASE_BASE}/villes/092d8b10-62e7-4254-9e2e-3b97571beb46_badiangara.jpeg`;
    return `${RegionsComponent.SUPABASE_BASE}/villes/72e5bb3b-0144-4ad7-aea5-0eb6d4b2e3f5_Bamako.jpg`;
  }

  getRegionImage(region: Region): string {
    const raw = (region.imageUrl || '').trim();
    if (raw && !raw.includes('unsplash.com')) {
      return raw.split(',')[0].trim();
    }
    return this.getRegionFallbackImage(region.nom, region.chefLieu);
  }

  onRegionImageError(event: Event, region: Region): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      const fallback = this.getRegionFallbackImage(region.nom, region.chefLieu);
      if (img.src !== fallback) {
        img.src = fallback;
      }
    }
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
    this.uploadService.uploadImage(file, 'regions', 'REGION', this.editingRegionId ?? undefined).subscribe({
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

    if (this.latitude !== null && (isNaN(Number(this.latitude)) || Number(this.latitude) < -90 || Number(this.latitude) > 90)) {
      this.showNotification('La latitude doit être comprise entre -90° et +90°.', true);
      return;
    }
    if (this.longitude !== null && (isNaN(Number(this.longitude)) || Number(this.longitude) < -180 || Number(this.longitude) > 180)) {
      this.showNotification('La longitude doit être comprise entre -180° et +180°.', true);
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
      latitude: this.latitude !== null ? Number(this.latitude) : undefined,
      longitude: this.longitude !== null ? Number(this.longitude) : undefined,
      description: this.description.trim() || undefined,
      imageUrl: this.imageUrl.trim() || this.getRegionFallbackImage(trimmedName, this.chefLieu),
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
    this.population =
      region.population != null
        ? String(region.population)
        : region.nbreHbt != null
          ? String(region.nbreHbt)
          : '';
    this.superficie = region.superficie || '';
    this.latitude = region.latitude ?? null;
    this.longitude = region.longitude ?? null;
    this.description = region.description || '';
    this.imageUrl = this.getRegionImage(region);
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  async onDelete(region: Region): Promise<void> {
    const targetId = region.id ?? (region as any).idRegion;
    if (!targetId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la région',
      message: `Voulez-vous vraiment supprimer la région "${region.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.regionService.deleteRegion(targetId).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Région "${region.nom}" supprimée.`);
        this.loadRegions();
        this.cdr.detectChanges();
      },
      error: () => {
        this.dialogService.toastError('Erreur lors de la suppression.');
        this.cdr.detectChanges();
      }
    });
  }

  resetForm(): void {
    this.regionName = '';
    this.chefLieu = '';
    this.population = '';
    this.superficie = '';
    this.latitude = null;
    this.longitude = null;
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
