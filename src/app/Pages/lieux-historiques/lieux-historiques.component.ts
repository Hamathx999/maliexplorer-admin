import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { filter } from 'rxjs';
import { LieuHistoriqueService } from '../../services/lieu-historique.service';
import { VilleService } from '../../services/ville.service';
import { AuthService } from '../../services/auth.service';
import { LieuHistorique } from '../../models/lieu-historique.model';
import { Ville } from '../../models/ville.model';

@Component({
  selector: 'app-lieux-historiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lieux-historiques.component.html',
  styleUrl: './lieux-historiques.component.css'
})
export class LieuxHistoriquesComponent implements OnInit {

  private readonly lieuService = inject(LieuHistoriqueService);
  private readonly villeService = inject(VilleService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  lieux: LieuHistorique[] = [];
  filteredLieux: LieuHistorique[] = [];
  availableVilles: Ville[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  // Toggle between list view and creation/edition view (matching Figma design)
  isEditing: boolean = false;
  editingLieu: LieuHistorique | null = null;
  isDragOver: boolean = false;
  isSaving: boolean = false;

  formData: Partial<LieuHistorique> = {
    nom: '',
    epoque: '',
    ville: '',
    region: 'Tombouctou',
    coordonneesGps: '',
    description: '',
    classeUnesco: false,
    panorama360Url: '',
    images: []
  };

  get pageTitle(): string {
    if (this.isEditing) {
      return this.editingLieu ? 'Modifier le Lieu Historique' : 'Ajouter un Lieu Historique';
    }
    return 'Gestion des Lieux Historiques';
  }

  ngOnInit(): void {
    this.loadLieux();
    this.loadVilles();

    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });

    this.route.queryParams.subscribe((params) => {
      if (params['action'] === 'add') {
        this.startAdd(false);
      }
    });
  }

  private checkRoute(url: string): void {
    if (url.includes('/ajouter')) {
      if (!this.isEditing) {
        this.startAdd(false);
      }
    } else if (!this.editingLieu && this.isEditing) {
      this.isEditing = false;
      this.cdr.markForCheck();
    }
  }

  loadLieux(): void {
    this.lieuService.getLieux().subscribe({
      next: (data: LieuHistorique[]) => {
        this.lieux = data;
        this.filterLieux();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => console.error('Erreur chargement lieux historiques', err)
    });
  }

  loadVilles(): void {
    this.villeService.getVilles().subscribe({
      next: (villes: Ville[]) => {
        this.availableVilles = villes;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => console.warn('Erreur chargement villes', err)
    });
  }

  filterLieux(): void {
    this.filteredLieux = this.lieux.filter((l) => {
      const nom = l.nom || l.nomLieuHisto || '';
      const ville = l.ville || '';
      const epoque = l.epoque || '';

      const matchSearch =
        !this.searchTerm ||
        nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        ville.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        epoque.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchRegion =
        this.selectedRegion === 'TOUTES' ||
        l.region?.toLowerCase() === this.selectedRegion.toLowerCase();

      return matchSearch && matchRegion;
    });
    this.cdr.markForCheck();
  }

  private readonly villeRegionMap: Record<string, string> = {
    'bamako': 'Bamako',
    'djenné': 'Mopti',
    'djenne': 'Mopti',
    'mopti': 'Mopti',
    'tombouctou': 'Tombouctou',
    'ségou': 'Ségou',
    'segou': 'Ségou',
    'sikasso': 'Sikasso',
    'kayes': 'Kayes',
    'gao': 'Gao',
    'kidal': 'Kidal',
    'koulikoro': 'Koulikoro',
    'san': 'Ségou',
    'bandiagara': 'Mopti'
  };

  onVilleChange(cityName: string): void {
    if (!cityName) return;
    const cleanCity = cityName.trim();
    const match = this.availableVilles.find(
      (v) => v.nom.toLowerCase() === cleanCity.toLowerCase()
    );
    if (match) {
      if (match.id) {
        this.formData.villeId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
      }
      if (match.region) {
        this.formData.region = match.region;
      }
    } else {
      const reg = this.villeRegionMap[cleanCity.toLowerCase()];
      if (reg) {
        this.formData.region = reg;
      }
    }
  }

  startAdd(navigate: boolean = true): void {
    this.editingLieu = null;
    this.formData = {
      nom: '',
      epoque: '',
      ville: '',
      region: 'Tombouctou',
      coordonneesGps: '',
      description: '',
      classeUnesco: false,
      panorama360Url: '',
      images: []
    };
    this.isEditing = true;
    if (navigate && !this.router.url.includes('/ajouter')) {
      this.router.navigate(['/lieux-historiques/ajouter']);
    }
    this.cdr.markForCheck();
  }

  startEdit(lieu: LieuHistorique): void {
    this.editingLieu = lieu;
    const displayName = lieu.nom || lieu.nomLieuHisto || '';
    this.formData = {
      ...lieu,
      nom: displayName,
      coordonneesGps: lieu.cordonnees || lieu.coordonneesGps || '',
      images: lieu.images && lieu.images.length > 0 ? [...lieu.images] : [
        { nom: `${displayName.toLowerCase().replace(/\s+/g, '_')}_facade.jpg`, taille: '2.1 MB' }
      ]
    };
    this.isEditing = true;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingLieu = null;
    if (this.router.url.includes('/ajouter') || this.route.snapshot.queryParamMap.has('action')) {
      this.router.navigate(['/lieux-historiques']);
    }
    this.cdr.markForCheck();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  handleFiles(files: FileList): void {
    if (!this.formData.images) {
      this.formData.images = [];
    }

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        alert(`Le fichier "${file.name}" n'est pas une image.`);
        return;
      }

      const sizeMo = file.size / (1024 * 1024);
      const formattedSize =
        sizeMo >= 1 ? `${sizeMo.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const previewUrl = e.target?.result as string;
        this.formData.images?.push({
          nom: file.name,
          taille: formattedSize,
          url: previewUrl
        });
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    if (this.formData.images) {
      this.formData.images.splice(index, 1);
      this.cdr.markForCheck();
    }
  }

  saveLieu(): void {
    if (!this.formData.nom || !this.formData.epoque || !this.formData.ville) {
      alert('Veuillez renseigner le nom, l’époque et la ville.');
      return;
    }

    // Résolution automatique de la ville pour Spring Boot (villeId)
    if (!this.formData.villeId && this.formData.ville) {
      const match = this.availableVilles.find(
        (v) => v.nom.toLowerCase() === this.formData.ville?.trim().toLowerCase()
      );
      if (match && match.id) {
        this.formData.villeId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
      }
    }

    if (!this.formData.region && this.formData.ville) {
      this.formData.region = this.villeRegionMap[this.formData.ville.trim().toLowerCase()] || 'Mali';
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    if (this.editingLieu && (this.editingLieu.id || this.editingLieu.idLieu)) {
      const id = this.editingLieu.idLieu || this.editingLieu.id!;
      this.lieuService.updateLieu(id, this.formData as LieuHistorique).subscribe({
        next: (updated: LieuHistorique) => {
          this.isSaving = false;
          const idx = this.lieux.findIndex((l) => l.id === updated.id || l.idLieu === updated.idLieu);
          if (idx !== -1) {
            this.lieux[idx] = updated;
          } else {
            this.lieux.unshift(updated);
          }
          this.filterLieux();
          this.isEditing = false;
          this.editingLieu = null;
          this.router.navigate(['/lieux-historiques']);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving = false;
          this.cdr.markForCheck();
          this.handleHttpError(err, 'mise à jour');
        }
      });
    } else {
      this.lieuService.createLieu(this.formData as LieuHistorique).subscribe({
        next: (created: LieuHistorique) => {
          this.isSaving = false;
          alert(`Lieu historique "${created.nom || created.nomLieuHisto}" enregistré avec succès dans MySQL !`);
          this.lieux.unshift(created);
          this.filterLieux();
          this.isEditing = false;
          this.editingLieu = null;
          this.router.navigate(['/lieux-historiques']);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving = false;
          this.cdr.markForCheck();
          this.handleHttpError(err, 'création');
        }
      });
    }
  }

  deleteLieu(lieu: LieuHistorique): void {
    const idToDelete = lieu.idLieu || lieu.id;
    if (!idToDelete) return;

    const nom = lieu.nom || lieu.nomLieuHisto || 'ce lieu';
    if (confirm(`Confirmez-vous la suppression de "${nom}" ?`)) {
      this.lieuService.deleteLieu(idToDelete).subscribe({
        next: () => {
          this.lieux = this.lieux.filter((l) => l.id !== idToDelete && l.idLieu !== idToDelete);
          this.filterLieux();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.handleHttpError(err, 'suppression');
        }
      });
    }
  }

  private handleHttpError(err: HttpErrorResponse, action: string): void {
    console.error(`Erreur ${action} lieu historique :`, err);
    if (err.status === 401) {
      alert('🔒 Non autorisé : Token JWT manquant ou expiré. Veuillez vous connecter avec vos identifiants administrateur.');
    } else if (err.status === 403) {
      alert('⛔ Accès refusé : Seuls les utilisateurs avec le rôle Administrateur (ROLE_ADMIN) peuvent modifier les lieux historiques.');
    } else if (err.status === 404) {
      alert('⚠️ Ressource introuvable : La ville sélectionnée ou le lieu n\'existe pas dans la base de données.');
    } else {
      const msg = err.error?.message || err.message || 'Une erreur est survenue lors de la communication avec le serveur.';
      alert(`Erreur (${action}) : ${msg}`);
    }
  }
}
