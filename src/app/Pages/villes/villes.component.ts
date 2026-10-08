import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  villes: Ville[] = [];
  regions: Region[] = [];
  nom: string = '';
  selectedRegion: string = '';
  population: string = '';
  description: string = '';
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
    if (this.regions.length > 0 && !this.selectedRegion) {
      this.selectedRegion = this.regions[0].nom;
    }
    this.isEditing = true;
    this.router.navigate(['/villes/ajouter']);
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
    const nomStr = (this.nom || '').trim();
    if (!nomStr) {
      this.showNotification('Veuillez saisir le nom de la ville.', true);
      return;
    }

    const foundReg = this.regions.find((r) => r.nom === this.selectedRegion);
    const pop = (this.population || '').trim();
    const payload: any = {
      nom: nomStr,
      region: this.selectedRegion || 'Mopti',
      population: pop,
      nbreHbt: pop,
      idRegion: foundReg?.id,
      regionId: foundReg?.id,
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

  resetForm(): void {
    this.editingVilleId = null;
    this.nom = '';
    this.population = '';
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
