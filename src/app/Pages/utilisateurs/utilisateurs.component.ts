import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../services/user.service';
import { GuideService } from '../../services/guide.service';
import { UploadService } from '../../services/upload.service';
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  utilisateurs: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'TOUS';
  imageLoadErrors: Record<string, boolean> = {};

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
    langues: 'Français, Bambara',
    experience: 1,
    description: '',
    statutModeration: 'VALIDE'
  };

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
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.utilisateurs = data;
        // Synchroniser et enrichir avec les profils guides issus de /api/guides
        this.guideService.getGuides().subscribe({
          next: (guides) => {
            if (Array.isArray(guides) && guides.length > 0) {
              guides.forEach((g) => {
                const existing = this.utilisateurs.find(
                  (u) => String(u.id ?? (u as any).idUsers) === String(g.idUsers) || u.email === g.email
                );
                if (existing) {
                  existing.statutModeration = g.statutModeration || 'VALIDE';
                  existing.langues = g.langue || existing.langues;
                  existing.experience = g.experience ?? existing.experience;
                  existing.description = g.description || existing.description;
                  if (!existing.role || existing.role === 'Visiteur') {
                    existing.role = 'Guide Local';
                  }
                } else {
                  this.utilisateurs.push({
                    id: g.idUsers,
                    nom: g.nom,
                    prenom: g.prenom,
                    email: g.email,
                    adresse: g.adresse,
                    photoUrl: g.photoUrl,
                    pieceIdentite: g.pieceIdentite,
                    langues: g.langue,
                    experience: g.experience,
                    description: g.description,
                    role: 'Guide Local',
                    statut: 'ACTIF',
                    statutModeration: g.statutModeration || 'VALIDE',
                    dateInscription: g.dateCreation ? String(g.dateCreation) : 'Récemment inscrit'
                  });
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
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  filterUsers(): void {
    this.filteredUsers = this.utilisateurs.filter((u) => {
      const matchSearch =
        !this.searchTerm ||
        (u.nom && u.nom.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (u.prenom && u.prenom.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchRole =
        this.selectedRole === 'TOUS' ||
        u.role?.toUpperCase() === this.selectedRole.toUpperCase();

      return matchSearch && matchRole;
    });
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
          alert(err.message || 'Erreur lors du téléversement de la photo.');
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
          alert(err.message || 'Erreur lors du téléversement de la pièce.');
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
          alert(err.message || 'Erreur lors du téléversement.');
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
          alert(err.message || 'Erreur téléversement photos événement.');
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
      langues: 'Français, Bambara',
      experience: 1,
      description: '',
      statutModeration: 'VALIDE'
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
      langues: user.langues || 'Français, Bambara',
      experience: user.experience ?? 1,
      description: user.description || '',
      statutModeration: user.statutModeration || 'VALIDE'
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingUser = null;
    this.router.navigate(['/utilisateurs']);
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
    const str = (name || 'Utilisateur').trim();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  saveUser(): void {
    if (!this.formData.nom || !this.formData.nom.trim() || !this.formData.email || !this.formData.email.trim()) {
      alert('Veuillez renseigner le nom et l’adresse email.');
      return;
    }

    this.formData.role = this.activeRoleTab;
    const editingId = this.editingUser?.id ?? (this.editingUser as any)?.idUsers ?? this.formData?.id ?? (this.formData as any)?.idUsers;

    // Gestion dédiée pour les Guides via GuideService (/api/guides)
    if (this.activeRoleTab === 'Guide') {
      const guidePayload: GuideRequestDTO = {
        nom: this.formData.nom?.trim() || '',
        prenom: this.formData.prenom?.trim() || this.formData.nom?.trim() || 'Guide',
        email: this.formData.email?.trim() || '',
        motDePasse: this.formData.motDePasse || undefined,
        adresse: this.formData.adresse?.trim() || '',
        photoUrl: this.formData.photoUrl || '',
        experience: this.formData.experience != null ? Number(this.formData.experience) : 1,
        description: this.formData.description?.trim() || 'Guide touristique local',
        langue: this.formData.langues?.trim() || 'Français, Bambara',
        pieceIdentite: this.formData.pieceIdentite || ''
      };

      if (editingId) {
        this.guideService.updateGuide(editingId, guidePayload).subscribe({
          next: () => {
            this.loadUsers();
            this.cancelEdit();
          },
          error: (err) => {
            console.error('Erreur mise à jour guide via API guides, repli sur userService :', err);
            this.userService.updateUser(editingId, this.formData as User).subscribe({
              next: () => {
                this.loadUsers();
                this.cancelEdit();
              }
            });
          }
        });
      } else {
        this.guideService.createGuide(guidePayload).subscribe({
          next: () => {
            this.loadUsers();
            this.cancelEdit();
          },
          error: (err) => {
            console.error('Erreur création guide via API guides, repli sur userService :', err);
            this.userService.createUser(this.formData as User).subscribe({
              next: () => {
                this.loadUsers();
                this.cancelEdit();
              }
            });
          }
        });
      }
      return;
    }

    if (editingId) {
      this.userService.updateUser(editingId, this.formData as User).subscribe({
        next: (updated) => {
          const updatedId = updated?.id ?? (updated as any)?.idUsers ?? editingId;
          const idx = this.utilisateurs.findIndex((u) => String(u.id ?? (u as any).idUsers) === String(updatedId));
          if (idx !== -1) {
            this.utilisateurs[idx] = { ...updated, id: updatedId };
          } else {
            this.loadUsers();
          }
          this.filterUsers();
          this.cancelEdit();
        }
      });
    } else {
      this.userService.createUser(this.formData as User).subscribe({
        next: (created) => {
          this.utilisateurs.unshift(created);
          this.filterUsers();
          this.cancelEdit();
        }
      });
    }
  }

  deleteUser(user: User): void {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;
    const isGuide = (user.role || '').toLowerCase().includes('guide');
    if (confirm(`Confirmez-vous la suppression du compte "${user.email}" ?`)) {
      if (isGuide) {
        this.guideService.deleteGuide(userId).subscribe({
          next: () => {
            this.utilisateurs = this.utilisateurs.filter((u) => String(u.id ?? (u as any).idUsers) !== String(userId));
            this.filterUsers();
          },
          error: () => {
            this.userService.deleteUser(userId).subscribe({
              next: () => {
                this.utilisateurs = this.utilisateurs.filter((u) => String(u.id ?? (u as any).idUsers) !== String(userId));
                this.filterUsers();
              }
            });
          }
        });
      } else {
        this.userService.deleteUser(userId).subscribe({
          next: () => {
            this.utilisateurs = this.utilisateurs.filter((u) => String(u.id ?? (u as any).idUsers) !== String(userId));
            this.filterUsers();
          }
        });
      }
    }
  }

  validerGuide(user: User): void {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;
    this.guideService.validerGuide(userId).subscribe({
      next: () => {
        user.statutModeration = 'VALIDE';
        user.statut = 'ACTIF';
        this.filterUsers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur validation guide :', err);
        user.statutModeration = 'VALIDE';
        user.statut = 'ACTIF';
        this.filterUsers();
        this.cdr.markForCheck();
      }
    });
  }

  rejeterGuide(user: User): void {
    const userId = user?.id ?? (user as any)?.idUsers;
    if (!userId) return;
    const motif = prompt('Veuillez préciser le motif de rejet (optionnel) :') || '';
    this.guideService.rejeterGuide(userId, motif).subscribe({
      next: () => {
        user.statutModeration = 'REJETE';
        this.filterUsers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur rejet guide :', err);
        user.statutModeration = 'REJETE';
        this.filterUsers();
        this.cdr.markForCheck();
      }
    });
  }
}
