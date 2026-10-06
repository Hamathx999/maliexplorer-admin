import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { RegionService } from '../../services/region.service';
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  regions: Region[] = [];
  regionName: string = '';
  editingRegionId: number | string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
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
    this.editingRegionId = null;
    this.regionName = '';
    this.isEditing = true;
    this.router.navigate(['/regions/ajouter']);
  }

  loadRegions(): void {
    this.isLoading = true;
    this.regionService.getRegions().subscribe({
      next: (data) => {
        this.regions = data;
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
    const trimmedName = this.regionName.trim();
    if (!trimmedName) {
      this.showNotification('Veuillez saisir le nom de la région.', true);
      return;
    }

    if (this.editingRegionId !== null) {
      this.regionService.updateRegion(this.editingRegionId, { nom: trimmedName }).subscribe({
        next: () => {
          this.showNotification(`Région "${trimmedName}" mise à jour avec succès.`);
          this.resetForm();
          this.loadRegions();
        },
        error: () => {
          this.showNotification('Erreur lors de la mise à jour de la région.', true);
        }
      });
    } else {
      this.regionService.createRegion({ nom: trimmedName }).subscribe({
        next: () => {
          this.showNotification(`Région "${trimmedName}" ajoutée avec succès.`);
          this.resetForm();
          this.loadRegions();
        },
        error: () => {
          this.showNotification("Erreur lors de l'ajout de la région.", true);
        }
      });
    }
  }

  onEdit(region: Region): void {
    this.editingRegionId = region.id ?? null;
    this.regionName = region.nom;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(region: Region): void {
    if (!region.id) return;
    const confirmDelete = window.confirm(`Voulez-vous vraiment supprimer la région "${region.nom}" ?`);
    if (confirmDelete) {
      this.regionService.deleteRegion(region.id).subscribe({
        next: () => {
          this.showNotification(`Région "${region.nom}" supprimée.`);
          this.loadRegions();
        },
        error: () => {
          this.showNotification('Erreur lors de la suppression.', true);
        }
      });
    }
  }

  resetForm(): void {
    this.regionName = '';
    this.editingRegionId = null;
    this.isEditing = false;
    this.router.navigate(['/regions']);
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
