import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LieuHistoriqueService } from '../../services/lieu-historique.service';
import { LieuHistorique } from '../../models/lieu-historique.model';

@Component({
  selector: 'app-lieux-historiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lieux-historiques.component.html',
  styleUrl: './lieux-historiques.component.css'
})
export class LieuxHistoriquesComponent implements OnInit {
  private readonly lieuService = inject(LieuHistoriqueService);

  lieux: LieuHistorique[] = [];
  filteredLieux: LieuHistorique[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  // Toggle between list view and creation/edition view (matching Figma design)
  isEditing: boolean = false;
  editingLieu: LieuHistorique | null = null;

  formData: Partial<LieuHistorique> = {
    nom: '',
    epoque: '',
    ville: '',
    region: 'Tombouctou',
    coordonneesGps: '',
    description: '',
    classeUnesco: false,
    images: []
  };

  ngOnInit(): void {
    this.loadLieux();
  }

  loadLieux(): void {
    this.lieuService.getLieux().subscribe({
      next: (data: LieuHistorique[]) => {
        this.lieux = data;
        this.filterLieux();
      },
      error: (err: unknown) => console.error('Erreur chargement lieux historiques', err)
    });
  }

  filterLieux(): void {
    this.filteredLieux = this.lieux.filter((l) => {
      const matchSearch =
        !this.searchTerm ||
        (l.nom && l.nom.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (l.ville && l.ville.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (l.epoque && l.epoque.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchRegion =
        this.selectedRegion === 'TOUTES' ||
        l.region?.toLowerCase() === this.selectedRegion.toLowerCase();

      return matchSearch && matchRegion;
    });
  }

  startAdd(): void {
    this.editingLieu = null;
    this.formData = {
      nom: '',
      epoque: '',
      ville: '',
      region: 'Tombouctou',
      coordonneesGps: '',
      description: '',
      classeUnesco: false,
      images: [
        { nom: 'vue_principale.jpg', taille: '2.4 MB' },
        { nom: 'details_architecturaux.jpg', taille: '1.8 MB' }
      ]
    };
    this.isEditing = true;
  }

  startEdit(lieu: LieuHistorique): void {
    this.editingLieu = lieu;
    this.formData = {
      ...lieu,
      images: lieu.images && lieu.images.length > 0 ? [...lieu.images] : [
        { nom: `${lieu.nom.toLowerCase().replace(/\s+/g, '_')}_facade.jpg`, taille: '2.1 MB' }
      ]
    };
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingLieu = null;
  }

  removeImage(index: number): void {
    if (this.formData.images) {
      this.formData.images.splice(index, 1);
    }
  }

  saveLieu(): void {
    if (!this.formData.nom || !this.formData.epoque || !this.formData.ville) {
      alert('Veuillez renseigner le nom, l’époque et la ville.');
      return;
    }

    if (this.editingLieu && this.editingLieu.id) {
      this.lieuService.updateLieu(this.editingLieu.id, this.formData as LieuHistorique).subscribe({
        next: (updated: LieuHistorique) => {
          const idx = this.lieux.findIndex((l) => l.id === updated.id);
          if (idx !== -1) this.lieux[idx] = updated;
          this.filterLieux();
          this.isEditing = false;
        }
      });
    } else {
      this.lieuService.createLieu(this.formData as LieuHistorique).subscribe({
        next: (created: LieuHistorique) => {
          this.lieux.unshift(created);
          this.filterLieux();
          this.isEditing = false;
        }
      });
    }
  }

  deleteLieu(lieu: LieuHistorique): void {
    if (!lieu.id) return;
    if (confirm(`Confirmez-vous la suppression de "${lieu.nom}" ?`)) {
      this.lieuService.deleteLieu(lieu.id).subscribe({
        next: () => {
          this.lieux = this.lieux.filter((l) => l.id !== lieu.id);
          this.filterLieux();
        }
      });
    }
  }
}
