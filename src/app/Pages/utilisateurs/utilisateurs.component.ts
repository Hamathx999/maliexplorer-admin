import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../services/user.service';
import { UploadService } from '../../services/upload.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css'
})
export class UtilisateursComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  utilisateurs: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'TOUS';

  // Role selector for add/edit form (Touriste, Promoteur, Guide)
  activeRoleTab: 'Touriste' | 'Promoteur' | 'Guide' = 'Touriste';
  showPassword: boolean = false;
  acceptTerms: boolean = true;

  // Upload progress states
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
    photosEvenement: []
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
        this.filterUsers();
        this.cdr.markForCheck();
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
      photosEvenement: []
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
      photosEvenement: user.photosEvenement ? [...user.photosEvenement] : []
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingUser = null;
    this.router.navigate(['/utilisateurs']);
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

    if (this.editingUser && this.editingUser.id) {
      this.userService.updateUser(this.editingUser.id, this.formData as User).subscribe({
        next: (updated) => {
          const idx = this.utilisateurs.findIndex((u) => String(u.id) === String(updated.id));
          if (idx !== -1) {
            this.utilisateurs[idx] = updated;
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
    if (!user.id) return;
    if (confirm(`Confirmez-vous la suppression du compte "${user.email}" ?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.utilisateurs = this.utilisateurs.filter((u) => String(u.id) !== String(user.id));
          this.filterUsers();
        }
      });
    }
  }
}
