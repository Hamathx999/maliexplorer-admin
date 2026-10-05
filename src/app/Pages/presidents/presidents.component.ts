import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PresidentService } from '../../services/president.service';
import { President } from '../../models/president.model';

@Component({
  selector: 'app-presidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presidents.component.html',
  // styleUrl: './presidents.component.css'
})
export class PresidentsComponent implements OnInit {
  private readonly presidentService = inject(PresidentService);

  presidents: President[] = [];
  nom: string = '';
  periode: string = '';
  titre: string = '';
  biographie: string = '';
  editingPresidentId: number | string | null = null;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadPresidents();
  }

  loadPresidents(): void {
    this.isLoading = true;
    this.presidentService.getPresidents().subscribe({
      next: (data) => {
        this.presidents = data;
        this.isLoading = false;
      },
      error: () => (this.isLoading = false)
    });
  }

  onSubmit(): void {
    if (!this.nom.trim() || !this.periode.trim()) {
      this.showNotification('Veuillez renseigner le nom et la période du chef d’État.', true);
      return;
    }

    const payload: President = {
      nom: this.nom.trim(),
      periode: this.periode.trim(),
      titre: this.titre.trim(),
      biographie: this.biographie.trim()
    };

    if (this.editingPresidentId !== null) {
      this.presidentService.updatePresident(this.editingPresidentId, payload).subscribe({
        next: () => {
          this.showNotification(`Chef d'État "${payload.nom}" mis à jour.`);
          this.resetForm();
          this.loadPresidents();
        },
        error: () => this.showNotification('Erreur de mise à jour.', true)
      });
    } else {
      this.presidentService.createPresident(payload).subscribe({
        next: () => {
          this.showNotification(`Chef d'État "${payload.nom}" ajouté.`);
          this.resetForm();
          this.loadPresidents();
        },
        error: () => this.showNotification("Erreur lors de l'ajout.", true)
      });
    }
  }

  onEdit(president: President): void {
    this.editingPresidentId = president.id ?? null;
    this.nom = president.nom;
    this.periode = president.periode;
    this.titre = president.titre || '';
    this.biographie = president.biographie || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(president: President): void {
    if (!president.id) return;
    if (window.confirm(`Supprimer "${president.nom}" ?`)) {
      this.presidentService.deletePresident(president.id).subscribe({
        next: () => {
          this.showNotification(`Chef d'État "${president.nom}" supprimé.`);
          this.loadPresidents();
        },
        error: () => this.showNotification('Erreur de suppression.', true)
      });
    }
  }

  resetForm(): void {
    this.nom = '';
    this.periode = '';
    this.titre = '';
    this.biographie = '';
    this.editingPresidentId = null;
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
