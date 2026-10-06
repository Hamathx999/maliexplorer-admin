import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PlatService } from '../../services/plat.service';
import { Plat } from '../../models/plat.model';

@Component({
  selector: 'app-plats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plats.component.html',
  styleUrl: './plats.component.css'
})
export class PlatsComponent implements OnInit {
  private readonly platService = inject(PlatService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  plats: Plat[] = [];
  filteredPlats: Plat[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  isEditing: boolean = false;
  editingPlat: Plat | null = null;
  formData: Partial<Plat> = {
    nom: '',
    ingredientPrincipal: '',
    region: 'Nationale',
    tempsPreparation: '1h 30min',
    difficulte: 'Moyen',
    description: ''
  };

  ngOnInit(): void {
    this.loadPlats();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/plats/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingPlat && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadPlats(): void {
    this.platService.getPlats().subscribe({
      next: (data) => {
        this.plats = data;
        this.filterPlats();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement plats', err)
    });
  }

  filterPlats(): void {
    this.filteredPlats = this.plats.filter((p) => {
      const matchSearch =
        !this.searchTerm ||
        p.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (p.ingredientPrincipal && p.ingredientPrincipal.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchRegion =
        this.selectedRegion === 'TOUTES' ||
        p.region?.toLowerCase() === this.selectedRegion.toLowerCase();

      return matchSearch && matchRegion;
    });
  }

  startAdd(): void {
    this.editingPlat = null;
    this.formData = {
      nom: '',
      ingredientPrincipal: '',
      region: 'Nationale',
      tempsPreparation: '1h 30min',
      difficulte: 'Moyen',
      description: ''
    };
    this.isEditing = true;
    this.router.navigate(['/plats/ajouter']);
  }

  startEdit(plat: Plat): void {
    this.editingPlat = plat;
    this.formData = { ...plat };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingPlat = null;
    this.router.navigate(['/plats']);
  }

  savePlat(): void {
    // if (!this.formData.nom || !this.formData.nom.trim()) {
    //   alert('Veuillez renseigner le nom du plat.');
    //   return;
    // }

    // if (this.editingPlat && this.editingPlat.id) {
    //   this.platService.updatePlat(this.editingPlat.id, this.formData as Plat).subscribe({
    //     next: (updated) => {
    //       const idx = this.plats.findIndex((p) => String(p.id) === String(updated.id));
    //       if (idx !== -1) {
    //         this.plats[idx] = updated;
    //       } else {
    //         this.loadPlats();
    //       }
    //       this.filterPlats();
    //       this.cancelEdit();
    //     }
    //   });
    // } else {
    //   this.platService.createPlat(this.formData as Plat).subscribe({
    //     next: (created) => {
    //       this.plats.unshift(created);
    //       this.filterPlats();
    //       this.cancelEdit();
    //     }
    //   });
    // }
    
    console.log(this.formData.ingredientPrincipal?.split(","));
  }

  deletePlat(plat: Plat): void {
    if (!plat.id) return;
    if (confirm(`Confirmez-vous la suppression du plat traditionnel "${plat.nom}" ?`)) {
      this.platService.deletePlat(plat.id).subscribe({
        next: () => {
          this.plats = this.plats.filter((p) => String(p.id) !== String(plat.id));
          this.filterPlats();
        }
      });
    }
  }
}
