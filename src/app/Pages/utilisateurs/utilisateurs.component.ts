import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css'
})
export class UtilisateursComponent implements OnInit {
  private readonly userService = inject(UserService);

  utilisateurs: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'TOUS';

  showModal: boolean = false;
  editingUser: User | null = null;
  formData: Partial<User> = {
    nom: '',
    prenom: '',
    email: '',
    role: 'Explorateur',
    statut: 'ACTIF',
    points: 0
  };

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.utilisateurs = data;
        this.filterUsers();
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

  openAddModal(): void {
    this.editingUser = null;
    this.formData = {
      nom: '',
      prenom: '',
      email: '',
      role: 'Explorateur',
      statut: 'ACTIF',
      points: 0
    };
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.editingUser = user;
    this.formData = { ...user };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingUser = null;
  }

  saveUser(): void {
    if (!this.formData.nom || !this.formData.email) {
      alert('Veuillez renseigner le nom et l’email.');
      return;
    }

    if (this.editingUser && this.editingUser.id) {
      this.userService.updateUser(this.editingUser.id, this.formData as User).subscribe({
        next: (updated) => {
          const idx = this.utilisateurs.findIndex((u) => u.id === updated.id);
          if (idx !== -1) this.utilisateurs[idx] = updated;
          this.filterUsers();
          this.closeModal();
        }
      });
    } else {
      this.userService.createUser(this.formData as User).subscribe({
        next: (created) => {
          this.utilisateurs.unshift(created);
          this.filterUsers();
          this.closeModal();
        }
      });
    }
  }

  toggleBlock(user: User): void {
    if (!user.id) return;
    this.userService.toggleBlockUser(user.id).subscribe({
      next: (res) => {
        user.statut = res.statut;
        this.filterUsers();
      }
    });
  }

  deleteUser(user: User): void {
    if (!user.id) return;
    if (confirm(`Confirmez-vous la suppression de ${user.prenom || ''} ${user.nom} ?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.utilisateurs = this.utilisateurs.filter((u) => u.id !== user.id);
          this.filterUsers();
        }
      });
    }
  }
}
