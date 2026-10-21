import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdministrateurService } from '../../services/administrateur.service';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { Administrateur } from '../../models/administrateur.model';

@Component({
  selector: 'app-administrateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administrateurs.component.html',
  styleUrl: './administrateurs.component.css'
})
export class AdministrateursComponent implements OnInit {
  private readonly adminService = inject(AdministrateurService);
  readonly authService = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  administrateurs: Administrateur[] = [];
  filteredAdmins: Administrateur[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  isUploadingPhoto: boolean = false;
  imageLoadErrors: Record<string, boolean> = {};

  searchTerm: string = '';
  roleFilter: 'TOUS' | 'superAdmin' | 'admin' = 'TOUS';

  // État de la modale et du formulaire
  showModal: boolean = false;
  isEditing: boolean = false;
  editingAdminId: number | null = null;

  formData: Partial<Administrateur> = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    photoUrl: '',
    motDePasse: '',
    role: 'admin',
    statut: 'ACTIF'
  };

  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

  get countSuperAdmins(): number {
    return this.administrateurs.filter((a) => a.role === 'superAdmin').length;
  }

  get countAdmins(): number {
    return this.administrateurs.filter((a) => a.role === 'admin').length;
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAll().subscribe({
      next: (data) => {
        this.administrateurs = data || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement administrateurs:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter(): void {
    let list = [...this.administrateurs];

    if (this.roleFilter !== 'TOUS') {
      list = list.filter((a) => a.role === this.roleFilter);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.nom.toLowerCase().includes(q) ||
          a.prenom.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.telephone && a.telephone.toLowerCase().includes(q))
      );
    }

    this.filteredAdmins = list;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  setRoleFilter(filter: 'TOUS' | 'superAdmin' | 'admin'): void {
    this.roleFilter = filter;
    this.applyFilter();
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingAdminId = null;
    this.formData = {
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      adresse: '',
      photoUrl: '',
      motDePasse: '',
      role: 'admin',
      statut: 'ACTIF'
    };
    this.showModal = true;
  }

  openEditModal(admin: Administrateur): void {
    this.isEditing = true;
    this.editingAdminId = admin.idUsers ?? null;
    this.formData = {
      prenom: admin.prenom,
      nom: admin.nom,
      email: admin.email,
      telephone: admin.telephone || '',
      adresse: admin.adresse || '',
      photoUrl: admin.photoUrl || '',
      role: admin.role,
      statut: admin.statut || 'ACTIF'
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingAdminId = null;
    this.cdr.detectChanges();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingPhoto = true;

    this.uploadService.uploadImage(file, 'administrateurs').subscribe({
      next: (url) => {
        this.formData.photoUrl = url;
        this.isUploadingPhoto = false;
        this.showNotification('Photo de profil mise à jour avec succès', 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur upload photo admin:', err);
        this.isUploadingPhoto = false;
        this.showNotification('Impossible de téléverser la photo.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  saveAdmin(): void {
    if (!this.formData.prenom?.trim() || !this.formData.nom?.trim() || !this.formData.email?.trim()) {
      this.showNotification('Veuillez remplir le nom, prénom et email.', 'error');
      return;
    }

    this.isSaving = true;

    if (this.isEditing && this.editingAdminId) {
      this.adminService.update(this.editingAdminId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.showNotification('Administrateur mis à jour avec succès !', 'success');
          this.closeModal();
          this.loadAdmins();
        },
        error: (err) => {
          this.isSaving = false;
          this.showNotification(err?.error?.message || 'Erreur lors de la mise à jour.', 'error');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.create(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.showNotification('Nouvel administrateur ajouté avec succès !', 'success');
          this.closeModal();
          this.loadAdmins();
        },
        error: (err) => {
          this.isSaving = false;
          this.showNotification(err?.error?.message || 'Erreur lors de la création.', 'error');
          this.cdr.markForCheck();
        }
      });
    }
  }

  async toggleBlock(admin: Administrateur): Promise<void> {
    const actionLabel = admin.statut === 'ACTIF' ? 'bloquer' : 'activer';
    const confirmed = await this.dialogService.confirm({
      title: `${admin.statut === 'ACTIF' ? 'Bloquer' : 'Activer'} l'administrateur`,
      message: `Voulez-vous vraiment ${actionLabel} le compte de ${admin.prenom} ${admin.nom} ?`,
      confirmText: admin.statut === 'ACTIF' ? 'Bloquer' : 'Activer',
      cancelText: 'Annuler',
      type: admin.statut === 'ACTIF' ? 'warning' : 'success'
    });

    if (!confirmed) return;

    this.adminService.toggleBlock(admin).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Statut de ${admin.prenom} ${admin.nom} mis à jour.`);
        this.loadAdmins();
      },
      error: () => {
        this.dialogService.toastError('Erreur lors du changement de statut.');
      }
    });
  }

  async deleteAdmin(admin: Administrateur): Promise<void> {
    const current = this.authService.currentUser();
    if (current && current.email === admin.email) {
      this.dialogService.toastError('Vous ne pouvez pas supprimer votre propre compte administrateur !');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Révoquer l\'administrateur',
      message: `Attention : Voulez-vous définitivement révoquer le compte administrateur de ${admin.prenom} ${admin.nom} (${admin.email}) ? Cette action est irréversible.`,
      confirmText: 'Révoquer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.adminService.delete(admin.idUsers!).subscribe({
      next: () => {
        this.dialogService.toastSuccess(`Administrateur ${admin.prenom} ${admin.nom} révoqué.`);
        this.loadAdmins();
      },
      error: (err) => {
        this.dialogService.toastError(err?.error?.message || 'Erreur lors de la suppression.');
      }
    });
  }

  onAvatarError(key: string | number | undefined): void {
    if (key !== undefined) {
      this.imageLoadErrors[String(key)] = true;
    }
  }

  getAvatarColor(name: string): { bg: string; color: string } {
    const colors = [
      { bg: '#E8F5E9', color: '#1B5E20' },
      { bg: '#FEF3C7', color: '#92400E' },
      { bg: '#E0F2FE', color: '#0369A1' },
      { bg: '#F3E8FF', color: '#6B21A8' },
      { bg: '#FEE2E2', color: '#991B1B' }
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }

  private showNotification(msg: string, type: 'success' | 'error'): void {
    this.notificationMessage = msg;
    this.notificationType = type;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.notificationMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }
}

