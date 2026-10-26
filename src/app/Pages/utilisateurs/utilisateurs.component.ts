import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../services/user.service';
import { GuideService } from '../../services/guide.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { User } from '../../models/user.model';
import { GuideRequestDTO } from '../../models/guide.model';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css'
})
export class UtilisateursComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly guideService = inject(GuideService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  utilisateurs: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'TOUS';
  imageLoadErrors: Record<string, boolean> = {};
  isLoading: boolean = false;
  errorMessage: string = '';

  // Sélecteur de rôle pour le formulaire d'ajout/édition (Touriste, Promoteur, Guide)
  activeRoleTab: 'Touriste' | 'Promoteur' | 'Guide' = 'Touriste';
  showPassword: boolean = false;
  acceptTerms: boolean = true;

  // États de progression du téléversement
  isUploadingPhoto: boolean = false;
  isUploadingPiece: boolean = false;
  isUploadingPieceOrg: boolean = false;
  isUploadingEventPhotos: boolean = false;

  isEditing: boolean = false;
  editingUser: User | null = null;
  formData: Partial<User> = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    motDePasse: '',
    role: 'Touriste',
    statut: 'ACTIF',
    points: 0,
    photoUrl: '',
    pieceIdentite: '',
    nomOrganisation: '',
    adresseOrganisation: '',
    piecesJustificatifs: '',
    photoPieceOrganisation: '',
    nomEvenement: '',
    dateEvenement: '',
    descriptionEvenement: '',
    photosEvenement: [],
    langues: '',
    experience: undefined,
    description: '',
    statutModeration: ''
  };

  get totalUsersCount(): number {
    return this.utilisateurs.length;
  }

  get filteredUsersCount(): number {
    return this.filteredUsers.length;
  }

  ngOnInit(): void {
    this.loadUsers();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/utilisateurs/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingUser && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.utilisateurs = Array.isArray(data) ? data : [];
        this.isLoading = false;

        // Enrichir optionnellement avec les profils guides réels issus de /api/guides
        this.guideService.getGuides().subscribe({
          next: (guides) => {
            if (Array.isArray(guides) && guides.length > 0) {
              guides.forEach((g) => {
                const existing = this.utilisateurs.find(
                  (u) => String(u.id ?? (u as any).idUsers) === String(g.idUsers) || (u.email && g.email && u.email.toLowerCase() === g.email.toLowerCase())
                );
                if (existing) {
                  existing.statutModeration = g.statutModeration || existing.statutModeration;
                  existing.langues = g.langue || existing.langues;
                  existing.experience = g.experience ?? existing.experience;
                  existing.description = g.description || existing.description;
                  if (!existing.role || existing.role === 'Visiteur') {
                    existing.role = 'Guide Local';
                  }
                }
              });
            }
            this.filterUsers();
            this.cdr.markForCheck();
          },
          error: () => {
            this.filterUsers();
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Erreur chargement utilisateurs depuis le backend', err);
        this.isLoading = false;
        this.utilisateurs = [];
        this.filteredUsers = [];
        this.errorMessage = 'Impossible de charger la liste des utilisateurs depuis le serveur.';
        this.dialogService.toastError(this.errorMessage);
        this.cdr.markForCheck();
      }
    });
  }

  filterUsers(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    this.filteredUsers = this.utilisateurs.filter((u) => {
      const matchSearch =
        !term ||
        (u.nom && u.nom.toLowerCase().includes(term)) ||
        (u.prenom && u.prenom.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term));

      const matchRole =
        this.selectedRole === 'TOUS' ||
        (u.role && u.role.toUpperCase() === this.selectedRole.toUpperCase());

      return matchSearch && matchRole;
    });
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  onRoleFilterChange(role: string): void {
    this.selectedRole = role;
    this.filterUsers();
  }

  selectRole(role: 'Touriste' | 'Promoteur' | 'Guide'): void {
    this.activeRoleTab = role;
    this.formData.role = role;
  }

  onPhotoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingPhoto = true;
      this.uploadService.uploadImage(file, 'utilisateurs/avatars', 'UTILISATEUR', this.editingUser?.id).subscribe({
        next: (url) => {
          this.formData.photoUrl = url;
          this.isUploadingPhoto = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur téléversement photo profil:', err);
          this.isUploadingPhoto = false;
          this.dialogService.toastError(err.message || 'Erreur lors du téléversement de la photo.');
          this.cdr.markForCheck();
        }
      });
    }
  }

  onPiecePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingPiece = true;
      this.uploadService.uploadImage(file, 'utilisateurs/pieces', 'UTILISATEUR', this.editingUser?.id).subscribe({
        next: (url) => {
          this.formData.pieceIdentite = url;
          this.isUploadingPiece = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur téléversement pièce identité:', err);
          this.isUploadingPiece = false;
          this.dialogService.toastError(err.message || 'Erreur lors du téléversement de la pièce.');
          this.cdr.markForCheck();
        }
      });
    }
  }

  onPieceOrgPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingPieceOrg = true;
      this.uploadService.uploadImage(file, 'utilisateurs/organisation', 'UTILISATEUR', this.editingUser?.id).subscribe({
        next: (url) => {
          this.formData.photoPieceOrganisation = url;
          this.isUploadingPieceOrg = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur téléversement pièce organisation:', err);
          this.isUploadingPieceOrg = false;
          this.dialogService.toastError(err.message || 'Erreur lors du téléversement.');
          this.cdr.markForCheck();
        }
      });
    }
  }

  onEventPhotosPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.isUploadingEventPhotos = true;
      this.uploadService.uploadMultipleImages(files, 'utilisateurs/evenements', 'UTILISATEUR', this.editingUser?.id).subscribe({
        next: (urls) => {
          if (!this.formData.photosEvenement) {
            this.formData.photosEvenement = [];
          }
          this.formData.photosEvenement.push(...urls);
          this.isUploadingEventPhotos = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur téléversement photos événement:', err);
          this.isUploadingEventPhotos = false;
          this.dialogService.toastError(err.message || 'Erreur téléversement photos événement.');
          this.cdr.markForCheck();
        }
      });
    }
  }

  removePhoto(): void {
    this.formData.photoUrl = '';
  }

  removePiece(): void {
    this.formData.pieceIdentite = '';
  }

  removePieceOrg(): void {
    this.formData.photoPieceOrganisation = '';
  }

  removeEventPhoto(index: number): void {
    if (this.formData.photosEvenement) {
      this.formData.photosEvenement.splice(index, 1);
    }
  }

  startAdd(): void {
    this.editingUser = null;
    this.activeRoleTab = 'Touriste';
    this.formData = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      motDePasse: '',
      role: 'Touriste',
      statut: 'ACTIF',
      points: 0,
      photoUrl: '',
      pieceIdentite: '',
      nomOrganisation: '',
      adresseOrganisation: '',
      piecesJustificatifs: '',
      photoPieceOrganisation: '',
      nomEvenement: '',
      dateEvenement: '',
      descriptionEvenement: '',
      photosEvenement: [],
      langues: '',
      experience: undefined,
      description: '',
      statutModeration: ''
    };
    this.isEditing = true;
    this.router.navigate(['/utilisateurs/ajouter']);
  }

  startEdit(user: User): void {
    this.editingUser = user;
    const r = (user.role || '').toLowerCase();
    if (r.includes('guide')) {
      this.activeRoleTab = 'Guide';
    } else if (r.includes('promoteur')) {
      this.activeRoleTab = 'Promoteur';
    } else {
      this.activeRoleTab = 'Touriste';
    }

    this.formData = {
      ...user,
      photosEvenement: user.photosEvenement ? [...user.photosEvenement] : [],
      langues: user.langues || '',
      experience: user.experience,
      description: user.description || '',
      statutModeration: user.statutModeration || ''
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingUser = null;
    this.router.navigate(['/utilisateurs']);
    this.cdr.detectChanges();
  }

  onAvatarError(key: number | string | undefined): void {
    if (key != null) {
      this.imageLoadErrors[String(key)] = true;
      this.cdr.markForCheck();
    }
  }

  getAvatarColor(name: string): { bg: string; color: string } {
    const palette = [
      { bg: '#E8F5E9', color: '#1B5E20' },
      { bg: '#E3F2FD', color: '#0D47A1' },
      { bg: '#FFF3E0', color: '#E65100' },
      { bg: '#F3E5F5', color: '#4A148C' },
      { bg: '#FCE4EC', color: '#880E4F' },
      { bg: '#E0F2F1', color: '#004D40' },
      { bg: '#FEF9C3', color: '#854D0E' }
    ];
    let hash = 0;
    const str = (name || '').trim();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  saveUser(): void {
    if (!this.formData.nom?.trim() || !this.formData.email?.trim()) {
      this.dialogService.toastError('Veuillez renseigner le nom et l’adresse email.');
      return;
    }

    if (!this.formData.prenom || this.formData.prenom.trim().length < 2) {
      this.formData.prenom = this.formData.nom.trim();
    }

    this.formData.role = this.activeRoleTab;
    const editingId = this.editingUser?.id ?? (this.editingUser as any)?.idUsers ?? this.formData?.id ?? (this.formData as any)?.idUsers;

    if (editingId) {
      this.userService.updateUser(editingId, this.formData as User).subscribe({
        next: (updated) => {
          this.dialogService.toastSuccess('Compte utilisateur mis à jour avec succès.');
          this.loadUsers();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur mise à jour utilisateur:', err);
          const msg = err?.error?.message || err?.message || 'Erreur lors de la mise à jour de l\'utilisateur.';
          this.dialogService.toastError(msg);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.createUser(this.formData as User).subscribe({
        next: (created) => {
          this.dialogService.toastSuccess('Compte utilisateur créé avec succès.');
          this.loadUsers();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur création utilisateur:', err);
          const msg = err?.error?.message || err?.message || 'Erreur lors de la création de l\'utilisateur.';
          this.dialogService.toastError(msg);
          this.cdr.detectChanges();
        }
      });
    }
  }

  async deleteUser(user: User): Promise<void> {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer l\'utilisateur',
      message: `Confirmez-vous la suppression du compte "${user.email}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.utilisateurs = this.utilisateurs.filter((u) => String(u.id ?? (u as any).idUsers) !== String(userId));
        this.filterUsers();
        this.dialogService.toastSuccess(`Compte "${user.email}" supprimé avec succès.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur suppression utilisateur:', err);
        this.dialogService.toastError('Impossible de supprimer cet utilisateur.');
        this.cdr.detectChanges();
      }
    });
  }

  validerPartenaire(user: User): void {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;
    this.guideService.validerGuide(userId).subscribe({
      next: () => {
        user.statutModeration = 'VALIDE';
        user.statut = 'ACTIF';
        this.filterUsers();
        this.dialogService.toastSuccess(`Compte "${user.email}" validé avec succès.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur validation partenaire :', err);
        this.dialogService.toastError('Erreur lors de la validation du compte.');
        this.cdr.markForCheck();
      }
    });
  }

  rejeterPartenaire(user: User): void {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;
    const motif = prompt('Veuillez préciser le motif de rejet (optionnel) :') || '';
    this.guideService.rejeterGuide(userId, motif).subscribe({
      next: () => {
        user.statutModeration = 'REJETE';
        this.filterUsers();
        this.dialogService.toastSuccess(`Compte "${user.email}" rejeté.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur rejet partenaire :', err);
        this.dialogService.toastError('Erreur lors du rejet du compte.');
        this.cdr.markForCheck();
      }
    });
  }

  validerGuide(user: User): void {
    this.validerPartenaire(user);
  }

  rejeterGuide(user: User): void {
    this.rejeterPartenaire(user);
  }
}
