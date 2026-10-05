import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VilleService } from '../../services/ville.service';
import { RegionService } from '../../services/region.service';
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

  villes: Ville[] = [];
  regions: Region[] = [];
  nom: string = '';
  selectedRegion: string = '';
  population: string = '';
  editingVilleId: number | string | null = null;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadVilles();
    this.loadRegions();
  }

  loadVilles(): void {
    this.isLoading = true;
    this.villeService.getVilles().subscribe({
      next: (data) => {
        this.villes = data;
        this.isLoading = false;
      },
      error: () => (this.isLoading = false)
    });
  }

  loadRegions(): void {
    this.regionService.getRegions().subscribe((regs) => {
      this.regions = regs;
      if (this.regions.length > 0 && !this.selectedRegion) {
        this.selectedRegion = this.regions[0].nom;
      }
    });
  }

  onSubmit(): void {
    if (!this.nom.trim()) {
      this.showNotification('Veuillez saisir le nom de la ville.', true);
      return;
    }

    const payload: Ville = {
      nom: this.nom.trim(),
      region: this.selectedRegion || 'Mopti',
      population: this.population.trim()
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

  resetForm(): void {
    this.nom = '';
    this.population = '';
    this.editingVilleId = null;
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
