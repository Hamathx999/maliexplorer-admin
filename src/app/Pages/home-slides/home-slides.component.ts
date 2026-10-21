import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeSlideService } from '../../services/home-slide.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { HomeSlide } from '../../models/home-slide.model';

@Component({
  selector: 'app-home-slides',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-slides.component.html',
  styleUrl: './home-slides.component.css'
})
export class HomeSlidesComponent implements OnInit {
  private readonly slideService = inject(HomeSlideService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  slides: HomeSlide[] = [];
  isLoading: boolean = false;
  isEditing: boolean = false;
  isUploading: boolean = false;
  isDragging: boolean = false;

  successMessage: string = '';
  errorMessage: string = '';

  // Form fields
  editingSlideId: number | null = null;
  titre: string = '';
  sousTitre: string = '';
  legende: string = '';
  imageUrl: string = '';
  lienAction: string = '';
  ordre: number = 0;
  estActif: boolean = true;
  estPrincipal: boolean = false;

  // Live preview current index
  previewIndex: number = 0;

  ngOnInit(): void {
    this.loadSlides();
  }

  loadSlides(): void {
    this.isLoading = true;
    this.slideService.getAllSlides().subscribe({
      next: (data) => {
        this.slides = (data || []).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement slides:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  startAdd(): void {
    this.editingSlideId = null;
    this.titre = '';
    this.sousTitre = '';
    this.legende = '';
    this.imageUrl = '';
    this.lienAction = '';
    this.ordre = this.slides.length + 1;
    this.estActif = true;
    this.estPrincipal = this.slides.length === 0;
    this.isEditing = true;
  }

  onEdit(slide: HomeSlide): void {
    this.editingSlideId = slide.id ?? null;
    this.titre = slide.titre;
    this.sousTitre = slide.sousTitre || '';
    this.legende = slide.legende || '';
    this.imageUrl = slide.imageUrl;
    this.lienAction = slide.lienAction || '';
    this.ordre = slide.ordre;
    this.estActif = slide.estActif;
    this.estPrincipal = slide.estPrincipal;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingSlideId = null;
    this.cdr.detectChanges();
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
    this.uploadService.uploadImage(file, 'slides').subscribe({
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
    const titreTrim = (this.titre || '').trim();
    const urlTrim = (this.imageUrl || '').trim();

    if (!titreTrim) {
      this.showNotification('Veuillez renseigner un titre pour la diapositive.', true);
      return;
    }
    if (!urlTrim) {
      this.showNotification('Veuillez fournir une image pour la diapositive.', true);
      return;
    }

    const payload: Partial<HomeSlide> = {
      titre: titreTrim,
      sousTitre: (this.sousTitre || '').trim(),
      legende: (this.legende || '').trim(),
      imageUrl: urlTrim,
      lienAction: (this.lienAction || '').trim(),
      ordre: Number(this.ordre) || 0,
      estActif: Boolean(this.estActif),
      estPrincipal: Boolean(this.estPrincipal)
    };

    if (this.editingSlideId !== null) {
      this.slideService.updateSlide(this.editingSlideId, payload).subscribe({
        next: () => {
          this.showNotification(`Diapositive "${titreTrim}" mise à jour.`);
          this.isEditing = false;
          this.loadSlides();
          this.cdr.detectChanges();
        },
        error: () => {
          this.showNotification('Erreur lors de la modification.', true);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.slideService.createSlide(payload).subscribe({
        next: () => {
          this.showNotification(`Diapositive "${titreTrim}" créée avec succès.`);
          this.isEditing = false;
          this.loadSlides();
          this.cdr.detectChanges();
        },
        error: () => {
          this.showNotification("Erreur lors de l'enregistrement.", true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleActif(slide: HomeSlide): void {
    if (!slide.id) return;
    this.slideService.toggleActif(slide.id).subscribe({
      next: (updated) => {
        slide.estActif = updated.estActif;
        this.showNotification(`Diapositive ${slide.estActif ? 'activée' : 'désactivée'}.`);
        this.cdr.markForCheck();
      },
      error: () => this.showNotification('Erreur modification statut.', true)
    });
  }

  setPrincipal(slide: HomeSlide): void {
    if (!slide.id) return;
    this.slideService.setPrincipal(slide.id).subscribe({
      next: () => {
        this.slides.forEach(s => s.estPrincipal = (s.id === slide.id));
        this.showNotification(`"${slide.titre}" définie comme diapositive prioritaire.`);
        this.cdr.markForCheck();
      },
      error: () => this.showNotification('Erreur définition slide principale.', true)
    });
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const temp = this.slides[index];
    this.slides[index] = this.slides[index - 1];
    this.slides[index - 1] = temp;
    this.saveReorder();
  }

  moveDown(index: number): void {
    if (index >= this.slides.length - 1) return;
    const temp = this.slides[index];
    this.slides[index] = this.slides[index + 1];
    this.slides[index + 1] = temp;
    this.saveReorder();
  }

  private saveReorder(): void {
    const ids = this.slides.map(s => s.id!).filter(Boolean);
    this.slideService.reordonner(ids).subscribe({
      next: (updatedList) => {
        this.slides = updatedList;
        this.showNotification('Ordre des diapositives mis à jour.');
        this.cdr.markForCheck();
      },
      error: () => this.showNotification("Erreur lors du réordonnancement.", true)
    });
  }

  async onDelete(slide: HomeSlide): Promise<void> {
    if (!slide.id) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la diapositive',
      message: `Supprimer la diapositive "${slide.titre}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.slideService.deleteSlide(slide.id).subscribe({
      next: () => {
        this.dialogService.toastSuccess('Diapositive supprimée.');
        this.loadSlides();
      },
      error: () => this.dialogService.toastError('Erreur de suppression.')
    });
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

