import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EvenementService } from '../../services/evenement.service';
import { Evenement } from '../../models/evenement.model';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './evenements.component.html',
  styleUrl: './evenements.component.css'
})
export class EvenementsComponent implements OnInit {
  private readonly evenementService = inject(EvenementService);

  evenements: Evenement[] = [];
  filteredEvenements: Evenement[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'TOUS';

  showModal: boolean = false;
  editingEvenement: Evenement | null = null;
  formData: Partial<Evenement> = {
    titre: '',
    nomOrganisateur: '',
    emailOrganisateur: '',
    telephoneOrganisateur: '',
    dateDebut: '',
    dateFin: '',
    heureDebut: '09:00',
    heureFin: '18:00',
    lieu: '',
    ville: 'Bamako',
    region: 'Bamako',
    categorie: 'Festival Culturel',
    statut: 'APPROUVE',
    description: '',
    prix: 'Gratuit'
  };

  ngOnInit(): void {
    this.loadEvenements();
  }

  loadEvenements(): void {
    this.evenementService.getEvenements().subscribe({
      next: (data) => {
        this.evenements = data;
        this.filterEvenements();
      },
      error: (err) => console.error('Erreur chargement événements', err)
    });
  }

  filterEvenements(): void {
    this.filteredEvenements = this.evenements.filter((e) => {
      const matchSearch =
        !this.searchTerm ||
        (e.titre && e.titre.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (e.ville && e.ville.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (e.lieu && e.lieu.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (e.nomOrganisateur && e.nomOrganisateur.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchStatut =
        this.selectedStatut === 'TOUS' ||
        e.statut?.toUpperCase() === this.selectedStatut.toUpperCase();

      return matchSearch && matchStatut;
    });
  }

  openAddModal(): void {
    this.editingEvenement = null;
    this.formData = {
      titre: '',
      nomOrganisateur: '',
      emailOrganisateur: '',
      telephoneOrganisateur: '',
      dateDebut: '',
      dateFin: '',
      heureDebut: '09:00',
      heureFin: '18:00',
      lieu: '',
      ville: 'Bamako',
      region: 'Bamako',
      categorie: 'Festival Culturel',
      statut: 'APPROUVE',
      description: '',
      prix: 'Gratuit'
    };
    this.showModal = true;
  }

  openEditModal(evt: Evenement): void {
    this.editingEvenement = evt;
    this.formData = { ...evt };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingEvenement = null;
  }

  saveEvenement(): void {
    if (!this.formData.titre || !this.formData.dateDebut) {
      alert('Veuillez renseigner au minimum le titre et la date de début.');
      return;
    }

    if (this.editingEvenement && this.editingEvenement.id) {
      this.evenementService.updateEvenement(this.editingEvenement.id, this.formData as Evenement).subscribe({
        next: (updated) => {
          const idx = this.evenements.findIndex((e) => e.id === updated.id);
          if (idx !== -1) this.evenements[idx] = updated;
          this.filterEvenements();
          this.closeModal();
        }
      });
    } else {
      this.evenementService.createEvenement(this.formData as Evenement).subscribe({
        next: (created) => {
          this.evenements.unshift(created);
          this.filterEvenements();
          this.closeModal();
        }
      });
    }
  }

  approve(evt: Evenement): void {
    if (!evt.id) return;
    this.evenementService.approveEvenement(evt.id).subscribe({
      next: (res) => {
        evt.statut = 'APPROUVE';
        this.filterEvenements();
      }
    });
  }

  reject(evt: Evenement): void {
    if (!evt.id) return;
    const motif = prompt('Veuillez indiquer le motif du refus (optionnel) :');
    this.evenementService.rejectEvenement(evt.id, motif || undefined).subscribe({
      next: (res) => {
        evt.statut = 'REFUSE';
        this.filterEvenements();
      }
    });
  }

  deleteEvenement(evt: Evenement): void {
    if (!evt.id) return;
    if (confirm(`Confirmez-vous la suppression de l'événement "${evt.titre}" ?`)) {
      this.evenementService.deleteEvenement(evt.id).subscribe({
        next: () => {
          this.evenements = this.evenements.filter((e) => e.id !== evt.id);
          this.filterEvenements();
        }
      });
    }
  }
}
