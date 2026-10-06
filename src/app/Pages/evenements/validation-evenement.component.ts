import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { EvenementService } from '../../services/evenement.service';
import { Evenement } from '../../models/evenement.model';

@Component({
  selector: 'app-validation-evenement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './validation-evenement.component.html',
  styleUrl: './validation-evenement.component.css'
})
export class ValidationEvenementComponent implements OnInit {
  private readonly evenementService = inject(EvenementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  selectedEvenement: Evenement | null = null;
  loading: boolean = true;
  showRejectModal: boolean = false;
  rejectionReason: string = '';
  actionMessage: string | null = null;
  actionSuccess: boolean = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.loadEvenement(idParam);
    });
  }

  loadEvenement(id?: string | null): void {
    this.loading = true;
    if (id) {
      this.evenementService.getEvenementById(id).subscribe({
        next: (evt) => {
          this.selectedEvenement = evt;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadFallbackFirst();
        }
      });
    } else {
      this.loadFallbackFirst();
    }
  }

  private loadFallbackFirst(): void {
    this.evenementService.getEvenements().subscribe({
      next: (list) => {
        const pending = list.find(e => e.statut === 'EN_ATTENTE');
        this.selectedEvenement = pending || (list.length > 0 ? list[0] : null);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStatutLabel(): string {
    if (!this.selectedEvenement) return 'En attente';
    const s = this.selectedEvenement.statut?.toUpperCase();
    if (s === 'APPROUVE' || s === 'VALIDE') return 'Validé';
    if (s === 'REFUSE') return 'Rejeté';
    return 'En attente';
  }

  getStatutClass(): string {
    if (!this.selectedEvenement) return 'badge-attente';
    const s = this.selectedEvenement.statut?.toUpperCase();
    if (s === 'APPROUVE' || s === 'VALIDE') return 'badge-valide';
    if (s === 'REFUSE') return 'badge-rejete';
    return 'badge-attente';
  }

  formatDateDisplay(evt: Evenement | null): string {
    if (!evt) return '';
    if (evt.dateDebut && evt.dateFin) {
      return `${evt.dateDebut} au ${evt.dateFin}`;
    }
    return evt.dateDebut || '';
  }

  formatLieuDisplay(evt: Evenement | null): string {
    if (!evt) return '';
    const parts: string[] = [];
    if (evt.lieu) parts.push(evt.lieu);
    if (evt.ville && !evt.lieu?.toLowerCase().includes(evt.ville.toLowerCase())) {
      parts.push(evt.ville);
    }
    if (!parts.some(p => p.toLowerCase().includes('mali'))) {
      parts.push('Mali');
    }
    return parts.join(', ');
  }

  returnToList(): void {
    this.router.navigate(['/evenements']);
  }

  approveEvent(): void {
    if (!this.selectedEvenement || !this.selectedEvenement.id) return;
    this.evenementService.approveEvenement(this.selectedEvenement.id).subscribe({
      next: (updated) => {
        if (this.selectedEvenement) {
          this.selectedEvenement = {
            ...this.selectedEvenement,
            statut: 'APPROUVE'
          };
        }
        this.actionMessage = '✓ L’événement a été validé et publié avec succès !';
        this.actionSuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.actionMessage = null;
          this.cdr.detectChanges();
        }, 3500);
      },
      error: (err) => {
        console.error('Erreur validation événement', err);
        alert('Erreur lors de la validation de l’événement.');
      }
    });
  }

  openRejectModal(): void {
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  confirmRejection(): void {
    if (!this.selectedEvenement || !this.selectedEvenement.id) return;
    const reason = this.rejectionReason.trim();
    this.evenementService.rejectEvenement(this.selectedEvenement.id, reason).subscribe({
      next: (updated) => {
        if (this.selectedEvenement) {
          this.selectedEvenement = {
            ...this.selectedEvenement,
            statut: 'REFUSE',
            motifRejet: reason
          };
        }
        this.closeRejectModal();
        this.actionMessage = '✕ L’événement a été rejeté.';
        this.actionSuccess = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.actionMessage = null;
          this.cdr.detectChanges();
        }, 3500);
      },
      error: (err) => {
        console.error('Erreur rejet événement', err);
        alert('Erreur lors du rejet de l’événement.');
      }
    });
  }
}
