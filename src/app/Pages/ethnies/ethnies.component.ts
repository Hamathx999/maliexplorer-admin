import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { EthnieService } from '../../services/ethnie.service';
import { Ethnie } from '../../models/ethnie.model';

@Component({
  selector: 'app-ethnies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ethnies.component.html',
  styleUrl: './ethnies.component.css'
})
export class EthniesComponent implements OnInit {
  private readonly ethnieService = inject(EthnieService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ethnies: Ethnie[] = [];
  nom: string = '';
  langues: string = '';
  region: string = '';
  description: string = '';
  editingEthnieId: number | string | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadEthnies();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/ethnies/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingEthnieId && this.isEditing) {
      this.isEditing = false;
    }
  }

  startAdd(): void {
    this.editingEthnieId = null;
    this.nom = '';
    this.langues = '';
    this.region = '';
    this.description = '';
    this.isEditing = true;
    this.router.navigate(['/ethnies/ajouter']);
  }

  loadEthnies(): void {
    this.isLoading = true;
    this.ethnieService.getEthnies().subscribe({
      next: (data) => {
        this.ethnies = data;
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
    const nomStr = (this.nom || '').trim();
    if (!nomStr) {
      this.showNotification("Veuillez saisir le nom de l'ethnie.", true);
      return;
    }

    const payload: Ethnie = {
      nom: nomStr,
      langues: (this.langues || '').trim(),
      region: (this.region || '').trim(),
      description: (this.description || '').trim()
    };

    if (this.editingEthnieId !== null) {
      this.ethnieService.updateEthnie(this.editingEthnieId, payload).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${payload.nom}" mise à jour.`);
          this.resetForm();
          this.loadEthnies();
        },
        error: () => this.showNotification('Erreur de mise à jour.', true)
      });
    } else {
      this.ethnieService.createEthnie(payload).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${payload.nom}" ajoutée.`);
          this.resetForm();
          this.loadEthnies();
        },
        error: () => this.showNotification("Erreur lors de l'ajout.", true)
      });
    }
  }

  onEdit(ethnie: Ethnie): void {
    this.editingEthnieId = ethnie.id ?? null;
    this.nom = ethnie.nom || '';
    this.langues = ethnie.langues || '';
    this.region = ethnie.region || ethnie.ville || '';
    this.description = ethnie.description || '';
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(ethnie: Ethnie): void {
    if (!ethnie.id) return;
    if (window.confirm(`Supprimer l'ethnie "${ethnie.nom}" ?`)) {
      this.ethnieService.deleteEthnie(ethnie.id).subscribe({
        next: () => {
          this.showNotification(`Ethnie "${ethnie.nom}" supprimée.`);
          this.loadEthnies();
        },
        error: () => this.showNotification('Erreur de suppression.', true)
      });
    }
  }

  resetForm(): void {
    this.nom = '';
    this.langues = '';
    this.region = '';
    this.description = '';
    this.editingEthnieId = null;
    this.isEditing = false;
    this.router.navigate(['/ethnies']);
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
