import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlatService } from '../../services/plat.service';
import { Plat } from '../../models/plat.model';

@Component({
  selector: 'app-plats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plats.component.html',
  styleUrl: './plats.component.css'
})
export class PlatsComponent implements OnInit {
  private readonly platService = inject(PlatService);

  plats: Plat[] = [];
  filteredPlats: Plat[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  showModal: boolean = false;
  editingPlat: Plat | null = null;
  formData: Partial<Plat> = {
    nom: '',
    ingredientPrincipal: '',
    region: 'Nationale',
    tempsPreparation: '1h 30min',
    difficulte: 'Moyen',
    description: ''
  };

  ngOnInit(): void {
    this.loadPlats();
  }

  loadPlats(): void {
    this.platService.getPlats().subscribe({
      next: (data) => {
        this.plats = data;
        this.filterPlats();
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

  openAddModal(): void {
    this.editingPlat = null;
    this.formData = {
      nom: '',
      ingredientPrincipal: '',
      region: 'Nationale',
      tempsPreparation: '1h 30min',
      difficulte: 'Moyen',
      description: ''
    };
    this.showModal = true;
  }

  openEditModal(plat: Plat): void {
    this.editingPlat = plat;
    this.formData = { ...plat };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPlat = null;
  }

  savePlat(): void {
    if (!this.formData.nom || !this.formData.ingredientPrincipal) {
      alert('Veuillez renseigner le nom du plat et son ingrédient principal.');
      return;
    }

    if (this.editingPlat && this.editingPlat.id) {
      this.platService.updatePlat(this.editingPlat.id, this.formData as Plat).subscribe({
        next: (updated) => {
          const idx = this.plats.findIndex((p) => p.id === updated.id);
          if (idx !== -1) this.plats[idx] = updated;
          this.filterPlats();
          this.closeModal();
        }
      });
    } else {
      this.platService.createPlat(this.formData as Plat).subscribe({
        next: (created) => {
          this.plats.unshift(created);
          this.filterPlats();
          this.closeModal();
        }
      });
    }
  }

  deletePlat(plat: Plat): void {
    if (!plat.id) return;
    if (confirm(`Confirmez-vous la suppression du plat "${plat.nom}" ?`)) {
      this.platService.deletePlat(plat.id).subscribe({
        next: () => {
          this.plats = this.plats.filter((p) => p.id !== plat.id);
          this.filterPlats();
        }
      });
    }
  }
}
