import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  evenements: Evenement[] = [];
  filteredEvenements: Evenement[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'TOUS';

  isEditing: boolean = false;
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
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.loadEvenements();
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/evenements/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingEvenement && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadEvenements(): void {
    this.evenementService.getEvenements().subscribe({
      next: (data) => {
        this.evenements = data;
        this.filterEvenements();
        this.cdr.markForCheck();
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

  startAdd(): void {
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
    this.isEditing = true;
    this.router.navigate(['/evenements/ajouter']);
  }

  startEdit(evt: Evenement): void {
    this.editingEvenement = evt;
    this.formData = { ...evt };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingEvenement = null;
    this.router.navigate(['/evenements']);
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
          this.cancelEdit();
        }
      });
    } else {
      this.evenementService.createEvenement(this.formData as Evenement).subscribe({
        next: (created) => {
          this.evenements.unshift(created);
          this.filterEvenements();
          this.cancelEdit();
        }
      });
    }
  }

  approve(evt: Evenement): void {
    if (!evt.id) return;
    this.evenementService.approveEvenement(evt.id).subscribe({
      next: () => {
        evt.statut = 'APPROUVE';
        this.filterEvenements();
      }
    });
  }

  reject(evt: Evenement): void {
    if (!evt.id) return;
    const motif = prompt('Veuillez indiquer le motif du refus (optionnel) :');
    this.evenementService.rejectEvenement(evt.id, motif || undefined).subscribe({
      next: () => {
        evt.statut = 'REFUSE';
        this.filterEvenements();
      }
    });
  }

  goToValidation(evt: Evenement): void {
    const id = evt.id ?? 1;
    this.router.navigate(['/validation-evenement', id]);
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
