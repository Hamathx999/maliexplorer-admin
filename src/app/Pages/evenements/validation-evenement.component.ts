import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
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

  pendingEvenements: Evenement[] = [];
  selectedEvenement: Evenement | null = null;
  rejectionReason: string = '';
  showRejectModal: boolean = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.loadPendingEvenements(idParam);
  }

  loadPendingEvenements(selectId?: string | null): void {
    this.evenementService.getPendingEvenements().subscribe({
      next: (data) => {
        this.pendingEvenements = data;
        if (selectId) {
          this.selectedEvenement = this.pendingEvenements.find((e) => String(e.id) === selectId) || (this.pendingEvenements.length > 0 ? this.pendingEvenements[0] : null);
        } else if (this.pendingEvenements.length > 0 && !this.selectedEvenement) {
          this.selectedEvenement = this.pendingEvenements[0];
        }
      },
      error: (err) => console.error('Erreur chargement événements en attente', err)
    });
  }

  selectEvenement(evt: Evenement): void {
    this.selectedEvenement = evt;
  }

  approve(evt: Evenement): void {
    if (!evt.id) return;
    this.evenementService.approveEvenement(evt.id).subscribe({
      next: () => {
        this.pendingEvenements = this.pendingEvenements.filter((e) => e.id !== evt.id);
        this.selectedEvenement = this.pendingEvenements.length > 0 ? this.pendingEvenements[0] : null;
      }
    });
  }

  openRejectModal(evt: Evenement): void {
    this.selectedEvenement = evt;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  confirmRejection(): void {
    if (!this.selectedEvenement || !this.selectedEvenement.id) return;
    this.evenementService.rejectEvenement(this.selectedEvenement.id, this.rejectionReason).subscribe({
      next: () => {
        this.pendingEvenements = this.pendingEvenements.filter((e) => e.id !== this.selectedEvenement!.id);
        this.selectedEvenement = this.pendingEvenements.length > 0 ? this.pendingEvenements[0] : null;
        this.closeRejectModal();
      }
    });
  }
}
