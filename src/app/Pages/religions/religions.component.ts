import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReligionService } from '../../services/religion.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
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
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  religions: Religion[] = [];
  isLoading: boolean = false;
  isEditing: boolean = false;
  isSubmitting: boolean = false;
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
        this.religions = (data || []).map(r => this.normalizeReligion(r))
          .sort((a, b) => (a.ordreAffichage ?? 0) - (b.ordreAffichage ?? 0));
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

  private normalizeReligion(r: Religion): Religion {
    const desc = r.descriptionHistorique || r.description || r.histoire || '';
    const branches = r.courantsOuBranches && r.courantsOuBranches.length > 0
      ? r.courantsOuBranches
      : (r.branches ? r.branches.split(/[\n•,;]+/).map(s => s.trim()).filter(Boolean) : []);
    const pct = r.pourcentageEstime ?? (r.proportionPopulation ? parseFloat(r.proportionPopulation.replace('%', '').replace(',', '.')) : 0);
    const ord = r.ordreAffichage ?? r.ordre ?? 1;
    const pub = r.estPublie ?? r.publie ?? true;
    const lieux = r.lieuxEmblematiques || r.lieuxDeCulte || '';
    const prat = r.pratiquesEtFetes || r.pratiques || r.fetes || '';
    const src = r.sourceStatistique || r.sourceStatistiques || '';
    const annee = r.anneeStatistique ?? (r.anneeStatistiques ? parseInt(r.anneeStatistiques, 10) : 2022);

    return {
      ...r,
      descriptionHistorique: desc,
      description: desc,
      histoire: desc,
      courantsOuBranches: branches,
      pourcentageEstime: isNaN(pct) ? 0 : pct,
      ordreAffichage: ord,
      ordre: ord,
      estPublie: pub,
      publie: pub,
      lieuxEmblematiques: lieux,
      lieuxDeCulte: lieux,
      pratiquesEtFetes: prat,
      sourceStatistique: src,
      anneeStatistique: isNaN(annee) ? 2022 : annee
    };
  }

  startAdd(): void {
    this.resetForm();
    this.ordreAffichage = this.religions.length + 1;
    this.isEditing = true;
  }

  onEdit(religion: Religion): void {
    const normalized = this.normalizeReligion(religion);
    this.editingReligionId = normalized.id ?? null;
    this.nom = normalized.nom;
    this.pourcentageEstime = normalized.pourcentageEstime;
    this.sourceStatistique = normalized.sourceStatistique || '';
    this.anneeStatistique = normalized.anneeStatistique || 2022;
    this.descriptionHistorique = normalized.descriptionHistorique || '';
    this.courantsInput = (normalized.courantsOuBranches || []).join(', ');
    this.pratiquesEtFetes = normalized.pratiquesEtFetes || '';
    this.lieuxEmblematiques = normalized.lieuxEmblematiques || '';
    this.imageUrl = normalized.imageUrl || '';
    this.ordreAffichage = normalized.ordreAffichage;
    this.estPublie = normalized.estPublie;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.isEditing = false;
    this.isSubmitting = false;
    this.editingReligionId = null;
    this.nom = '';
    this.pourcentageEstime = 0;
    this.sourceStatistique = 'Recensement Général de la Population et de l’Habitat (RGPH-5 / INSTAT 2022)';
    this.anneeStatistique = 2022;
    this.descriptionHistorique = '';
    this.courantsInput = '';
    this.pratiquesEtFetes = '';
    this.lieuxEmblematiques = '';
    this.imageUrl = '';
    this.ordreAffichage = this.religions.length + 1;
    this.estPublie = true;
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
    if (this.isSubmitting) return;

    if (this.isUploading) {
      this.showNotification("Veuillez patienter pendant le téléversement de l'image...", true);
      return;
    }

    const nomTrim = (this.nom || '').trim();
    if (!nomTrim) {
      this.showNotification('Veuillez saisir le nom de la religion ou du culte.', true);
      return;
    }
    const desc = (this.descriptionHistorique || '').trim();
    if (!desc) {
      this.showNotification('Veuillez renseigner une description historique documentée.', true);
      return;
    }

    this.isSubmitting = true;

    const branchesList = this.courantsInput
      ? this.courantsInput.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    const branchesText = branchesList.length > 0 ? '• ' + branchesList.join('\n• ') : '';

    const payload: Partial<Religion> = {
      nom: nomTrim,
      categorie: 'Religion',
      pourcentageEstime: Number(this.pourcentageEstime) || 0,
      proportionPopulation: String(this.pourcentageEstime) + '%',
      sourceStatistique: (this.sourceStatistique || '').trim(),
      sourceStatistiques: (this.sourceStatistique || '').trim(),
      anneeStatistique: Number(this.anneeStatistique) || 2022,
      anneeStatistiques: String(this.anneeStatistique || 2022),
      descriptionHistorique: desc,
      description: desc,
      histoire: desc,
      courantsOuBranches: branchesList,
      branches: branchesText,
      pratiquesEtFetes: (this.pratiquesEtFetes || '').trim(),
      pratiques: (this.pratiquesEtFetes || '').trim(),
      fetes: (this.pratiquesEtFetes || '').trim(),
      lieuxEmblematiques: (this.lieuxEmblematiques || '').trim(),
      lieuxDeCulte: (this.lieuxEmblematiques || '').trim(),
      imageUrl: (this.imageUrl || '').trim(),
      ordreAffichage: Number(this.ordreAffichage) || 1,
      ordre: Number(this.ordreAffichage) || 1,
      estPublie: Boolean(this.estPublie),
      publie: Boolean(this.estPublie)
    };

    if (this.editingReligionId !== null) {
      this.religionService.updateReligion(this.editingReligionId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Religion "${nomTrim}" mise à jour.`);
          this.resetForm();
          this.loadReligions();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.showNotification(err?.error?.message || 'Erreur de modification.', true);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.religionService.createReligion(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showNotification(`Religion "${nomTrim}" enregistrée.`);
          this.resetForm();
          this.loadReligions();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.showNotification(err?.error?.message || "Erreur lors de l'enregistrement.", true);
          this.cdr.detectChanges();
        }
      });
    }
  }

  togglePublication(rel: Religion): void {
    if (!rel.id) return;
    this.religionService.togglePublication(rel.id).subscribe({
      next: (res: any) => {
        const newPub = res.estPublie ?? res.publie;
        rel.estPublie = Boolean(newPub);
        rel.publie = Boolean(newPub);
        this.showNotification(`Statut mis à jour : ${rel.estPublie ? 'Publié' : 'Brouillon'}.`);
        this.cdr.markForCheck();
      },
      error: () => this.showNotification('Erreur bascule de statut.', true)
    });
  }

  async onDelete(rel: Religion): Promise<void> {
    if (!rel.id) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la religion / spiritualité',
      message: `Supprimer définitivement la religion "${rel.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.religionService.deleteReligion(rel.id).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Religion "${rel.nom}" supprimée.`);
        this.loadReligions();
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

