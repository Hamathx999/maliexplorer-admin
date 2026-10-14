import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReligionService } from '../../services/religion.service';
import { UploadService } from '../../services/upload.service';
import { Religion } from '../../models/religion.model';

@Component({
  selector: 'app-religions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './religions.component.html',
  styleUrl: './religions.component.css'
})
export class ReligionsComponent implements OnInit {
  private readonly religionService = inject(ReligionService);
  private readonly uploadService = inject(UploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  religions: Religion[] = [];
  isLoading: boolean = false;
  isEditing: boolean = false;
  isUploading: boolean = false;
  isDragging: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';

  // Form
  editingReligionId: number | null = null;
  nom: string = '';
  pourcentageEstime: number = 0;
  sourceStatistique: string = 'Recensement Général de la Population et de l’Habitat (RGPH-5 / INSTAT 2022)';
  anneeStatistique: number = 2022;
  descriptionHistorique: string = '';
  courantsInput: string = '';
  pratiquesEtFetes: string = '';
  lieuxEmblematiques: string = '';
  imageUrl: string = '';
  ordreAffichage: number = 1;
  estPublie: boolean = true;

  ngOnInit(): void {
    this.loadReligions();
  }

  loadReligions(): void {
    this.isLoading = true;
    this.religionService.getAllReligions().subscribe({
      next: (data) => {
        this.religions = (data || []).sort((a, b) => (a.ordreAffichage ?? 0) - (b.ordreAffichage ?? 0));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement religions:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  startAdd(): void {
    this.editingReligionId = null;
    this.nom = '';
    this.pourcentageEstime = 0;
    this.sourceStatistique = 'Recensement Général (INSTAT / RGPH-5 / US State Dept IRF Report)';
    this.anneeStatistique = 2022;
    this.descriptionHistorique = '';
    this.courantsInput = '';
    this.pratiquesEtFetes = '';
    this.lieuxEmblematiques = '';
    this.imageUrl = '';
    this.ordreAffichage = this.religions.length + 1;
    this.estPublie = true;
    this.isEditing = true;
  }

  onEdit(religion: Religion): void {
    this.editingReligionId = religion.id ?? null;
    this.nom = religion.nom;
    this.pourcentageEstime = religion.pourcentageEstime;
    this.sourceStatistique = religion.sourceStatistique || '';
    this.anneeStatistique = religion.anneeStatistique || 2022;
    this.descriptionHistorique = religion.descriptionHistorique || '';
    this.courantsInput = (religion.courantsOuBranches || []).join(', ');
    this.pratiquesEtFetes = religion.pratiquesEtFetes || '';
    this.lieuxEmblematiques = religion.lieuxEmblematiques || '';
    this.imageUrl = religion.imageUrl || '';
    this.ordreAffichage = religion.ordreAffichage;
    this.estPublie = religion.estPublie;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingReligionId = null;
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      this.uploadSingleFile(input.files[0]);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.uploadSingleFile(event.dataTransfer.files[0]);
    }
  }

  private uploadSingleFile(file: File): void {
    this.isUploading = true;
    this.uploadService.uploadImage(file, 'religions').subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isUploading = false;
        this.showNotification('Image téléversée avec succès sur Supabase.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploading = false;
        this.showNotification(err.message || 'Échec du téléversement', true);
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    const nomTrim = (this.nom || '').trim();
    if (!nomTrim) {
      this.showNotification('Veuillez saisir le nom de la religion ou du culte.', true);
      return;
    }
    if (!this.descriptionHistorique.trim()) {
      this.showNotification('Veuillez renseigner une description historique documentée.', true);
      return;
    }

    const branches = this.courantsInput
      ? this.courantsInput.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const payload: Partial<Religion> = {
      nom: nomTrim,
      pourcentageEstime: Number(this.pourcentageEstime) || 0,
      sourceStatistique: (this.sourceStatistique || '').trim(),
      anneeStatistique: Number(this.anneeStatistique) || 2022,
      descriptionHistorique: this.descriptionHistorique.trim(),
      courantsOuBranches: branches,
      pratiquesEtFetes: (this.pratiquesEtFetes || '').trim(),
      lieuxEmblematiques: (this.lieuxEmblematiques || '').trim(),
      imageUrl: (this.imageUrl || '').trim(),
      ordreAffichage: Number(this.ordreAffichage) || 1,
      estPublie: Boolean(this.estPublie)
    };

    if (this.editingReligionId !== null) {
      this.religionService.updateReligion(this.editingReligionId, payload).subscribe({
        next: () => {
          this.showNotification(`Religion "${nomTrim}" mise à jour.`);
          this.isEditing = false;
          this.loadReligions();
        },
        error: () => this.showNotification('Erreur de modification.', true)
      });
    } else {
      this.religionService.createReligion(payload).subscribe({
        next: () => {
          this.showNotification(`Religion "${nomTrim}" enregistrée.`);
          this.isEditing = false;
          this.loadReligions();
        },
        error: () => this.showNotification("Erreur lors de l'enregistrement.", true)
      });
    }
  }

  togglePublication(rel: Religion): void {
    if (!rel.id) return;
    this.religionService.togglePublication(rel.id).subscribe({
      next: (res) => {
        rel.estPublie = res.estPublie;
        this.showNotification(`Statut mis à jour : ${rel.estPublie ? 'Publié' : 'Brouillon'}.`);
        this.cdr.markForCheck();
      },
      error: () => this.showNotification('Erreur bascule de statut.', true)
    });
  }

  onDelete(rel: Religion): void {
    if (!rel.id) return;
    if (confirm(`Supprimer la religion "${rel.nom}" ?`)) {
      this.religionService.deleteReligion(rel.id).subscribe({
        next: () => {
          this.showNotification('Suppression réussie.');
          this.loadReligions();
        },
        error: () => this.showNotification('Erreur de suppression.', true)
      });
    }
  }

  showNotification(msg: string, isError: boolean = false): void {
    if (isError) {
      this.errorMessage = msg;
      setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 3500);
    } else {
      this.successMessage = msg;
      setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3500);
    }
    this.cdr.markForCheck();
  }
}

