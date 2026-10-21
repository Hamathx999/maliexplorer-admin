import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { EvenementService } from '../../services/evenement.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
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
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  evenements: Evenement[] = [];
  filteredEvenements: Evenement[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'TOUS';

  isEditing: boolean = false;
  isSubmitting: boolean = false;
  editingEvenement: Evenement | null = null;
  isUploadingAffiche: boolean = false;
  isDragging: boolean = false;
  selectedAfficheName: string = '';

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
    prix: 'Gratuit',
    afficheUrl: '',
    imageUrl: ''
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
    this.selectedAfficheName = '';
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
      prix: 'Gratuit',
      afficheUrl: '',
      imageUrl: ''
    };
    this.isEditing = true;
    this.router.navigate(['/evenements/ajouter']);
  }

  onAffichePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadAffiche(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.uploadAffiche(event.dataTransfer.files[0]);
    }
  }

  private uploadAffiche(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }
    this.isUploadingAffiche = true;
    this.selectedAfficheName = file.name;
    this.cdr.markForCheck();

    const evtId = this.editingEvenement?.id ?? (this.editingEvenement as any)?.idEvenement;
    this.uploadService.uploadImage(file, 'evenements', 'EVENEMENT', evtId ?? undefined).subscribe({
      next: (url) => {
        this.formData.afficheUrl = url;
        this.formData.imageUrl = url;
        this.isUploadingAffiche = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur téléversement affiche événement:', err);
        this.isUploadingAffiche = false;
        alert(err.message || 'Erreur lors du téléversement de l’affiche.');
        this.cdr.markForCheck();
      }
    });
  }

  removeAffiche(): void {
    this.formData.afficheUrl = '';
    this.formData.imageUrl = '';
    this.selectedAfficheName = '';
    this.cdr.markForCheck();
  }

  startEdit(evt: Evenement): void {
    this.editingEvenement = evt;
    this.formData = { ...evt };
    this.selectedAfficheName = '';
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
    this.router.navigate(['/evenements']);
    this.cdr.detectChanges();
  }

  resetForm(): void {
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
      prix: 'Gratuit',
      afficheUrl: '',
      imageUrl: ''
    };
    this.editingEvenement = null;
    this.selectedAfficheName = '';
    this.isEditing = false;
    this.isSubmitting = false;
    this.isUploadingAffiche = false;
    this.isDragging = false;
    this.cdr.detectChanges();
  }

  saveEvenement(): void {
    if (this.isSubmitting) return;

    if (this.isUploadingAffiche) {
      alert("Veuillez patienter pendant l'envoi de l'affiche...");
      return;
    }

    if (!this.formData.titre || !this.formData.dateDebut) {
      alert('Veuillez renseigner au minimum le titre et la date de début.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const editingId = this.editingEvenement?.id ?? (this.editingEvenement as any)?.idEvenement ?? this.formData?.id ?? (this.formData as any)?.idEvenement;

    if (editingId) {
      this.evenementService.updateEvenement(editingId, this.formData as Evenement).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          const updatedId = updated?.id ?? (updated as any)?.idEvenement ?? editingId;
          const idx = this.evenements.findIndex((e) => (e.id ?? (e as any).idEvenement) === updatedId);
          if (idx !== -1) this.evenements[idx] = updated;
          this.filterEvenements();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur mise à jour événement:', err);
          alert("Erreur lors de la mise à jour de l'événement.");
          this.cdr.detectChanges();
        }
      });
    } else {
      this.evenementService.createEvenement(this.formData as Evenement).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.evenements.unshift(created);
          this.filterEvenements();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur création événement:', err);
          alert("Erreur lors de la création de l'événement.");
          this.cdr.detectChanges();
        }
      });
    }
  }

  approve(evt: Evenement): void {
    const evtId = evt?.id ?? (evt as any)?.idEvenement;
    if (!evtId) return;
    this.evenementService.approveEvenement(evtId).subscribe({
      next: () => {
        evt.statut = 'APPROUVE';
        this.filterEvenements();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  reject(evt: Evenement): void {
    const evtId = evt?.id ?? (evt as any)?.idEvenement;
    if (!evtId) return;
    const motif = prompt('Veuillez indiquer le motif du refus (optionnel) :');
    this.evenementService.rejectEvenement(evtId, motif || undefined).subscribe({
      next: () => {
        evt.statut = 'REFUSE';
        this.filterEvenements();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  goToValidation(evt: Evenement): void {
    const id = evt?.id ?? (evt as any)?.idEvenement ?? 1;
    this.router.navigate(['/validation-evenement', id]);
  }

  async deleteEvenement(evt: Evenement): Promise<void> {
    const evtId = evt?.id ?? (evt as any)?.idEvenement;
    if (!evtId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer l\'événement',
      message: `Confirmez-vous la suppression de l'événement "${evt.titre}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.evenementService.deleteEvenement(evtId).subscribe({
      next: () => {
        this.evenements = this.evenements.filter((e) => (e.id ?? (e as any).idEvenement) !== evtId);
        this.filterEvenements();
        this.dialogService.toastSuccess(`Événement "${evt.titre}" supprimé.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.dialogService.toastError('Erreur lors de la suppression de l\'événement.');
        this.cdr.detectChanges();
      }
    });
  }
}
