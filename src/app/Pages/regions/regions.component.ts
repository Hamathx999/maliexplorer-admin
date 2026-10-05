import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  regions: Region[] = [];
  regionName: string = '';
  editingRegionId: number | string | null = null;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadRegions();
  }

  loadRegions(): void {
    this.isLoading = true;
    this.regionService.getRegions().subscribe({
      next: (data) => {
        this.regions = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
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
  }

  private showNotification(msg: string, isError: boolean = false): void {
    if (isError) {
      this.errorMessage = msg;
      setTimeout(() => (this.errorMessage = ''), 4000);
    } else {
      this.successMessage = msg;
      setTimeout(() => (this.successMessage = ''), 4000);
    }
  }
}
