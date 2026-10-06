import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../services/user.service';
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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  utilisateurs: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'TOUS';

  isEditing: boolean = false;
  editingUser: User | null = null;
  formData: Partial<User> = {
    nom: '',
    prenom: '',
    email: '',
    role: 'Visiteur',
    statut: 'ACTIF',
    points: 0
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

  startAdd(): void {
    this.editingUser = null;
    this.formData = {
      nom: '',
      prenom: '',
      email: '',
      role: 'Visiteur',
      statut: 'ACTIF',
      points: 0
    };
    this.isEditing = true;
    this.router.navigate(['/utilisateurs/ajouter']);
  }

  startEdit(user: User): void {
    this.editingUser = user;
    this.formData = { ...user };
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
      { bg: '#E8F5E9', color: '#1B5E20' }, // Forest emerald
      { bg: '#E3F2FD', color: '#0D47A1' }, // Deep sky blue
      { bg: '#FFF3E0', color: '#E65100' }, // Warm terra cotta
      { bg: '#F3E5F5', color: '#4A148C' }, // Royal violet
      { bg: '#FCE4EC', color: '#880E4F' }, // Warm crimson rose
      { bg: '#E0F2F1', color: '#004D40' }, // Deep teal
      { bg: '#FEF9C3', color: '#854D0E' }  // Golden amber
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
