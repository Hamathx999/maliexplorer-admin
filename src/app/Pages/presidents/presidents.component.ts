import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PresidentService } from '../../services/president.service';
import { President } from '../../models/president.model';

@Component({
  selector: 'app-presidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presidents.component.html'
})
export class PresidentsComponent implements OnInit {
  private readonly presidentService = inject(PresidentService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  presidents: President[] = [];
  nom: string = '';
  prenom: string = '';
  periode: string = '';
  titre: string = '';
  biographie: string = '';
  editingPresidentId: number | string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadPresidents();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/presidents/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingPresidentId && this.isEditing) {
      this.isEditing = false;
    }
  }

  startAdd(): void {
    this.editingPresidentId = null;
    this.nom = '';
    this.prenom = '';
    this.periode = '';
    this.titre = '';
    this.biographie = '';
    this.isEditing = true;
    this.router.navigate(['/presidents/ajouter']);
  }

  loadPresidents(): void {
    this.isLoading = true;
    this.presidentService.getPresidents().subscribe({
      next: (data) => {
        this.presidents = data.map((p) => ({
          ...p,
          periode: p.periodeMandat || p.periode || '',
          periodeMandat: p.periodeMandat || p.periode || ''
        }));
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
    const nom = this.nom.trim();
    const prenom = this.prenom.trim();
    const periode = this.periode.trim();

    if (!nom || !periode) {
      this.showNotification('Veuillez renseigner le nom et la période du chef d’État.', true);
      return;
    }

    const payload: President = {
      nom: nom,
      prenom: prenom,
      periode: periode,
      periodeMandat: periode,
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
    this.nom = president.nom || '';
    this.prenom = president.prenom || '';
    this.periode = president.periodeMandat || president.periode || '';
    this.titre = president.titre || '';
    this.biographie = president.biographie || '';
    this.isEditing = true;
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
    this.prenom = '';
    this.periode = '';
    this.titre = '';
    this.biographie = '';
    this.editingPresidentId = null;
    this.isEditing = false;
    this.router.navigate(['/presidents']);
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
