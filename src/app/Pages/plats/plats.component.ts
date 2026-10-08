import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PlatService } from '../../services/plat.service';
import { IngredientService } from '../../services/ingredient.service';
import { Plat } from '../../models/plat.model';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-plats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plats.component.html',
  styleUrl: './plats.component.css'
})
export class PlatsComponent implements OnInit {
  private readonly platService = inject(PlatService);
  private readonly ingredientService = inject(IngredientService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  plats: Plat[] = [];
  filteredPlats: Plat[] = [];
  availableIngredients: Ingredient[] = [];
  selectedIngredientIds: number[] = [];
  searchTerm: string = '';
  selectedRegion: string = 'TOUTES';

  isEditing: boolean = false;
  editingPlat: Plat | null = null;
  formData: Partial<Plat> = {
    nom: '',
    ingredientPrincipal: '',
    ingredientIds: [],
    region: 'Nationale',
    tempsPreparation: '1h 30min',
    difficulte: 'Moyen',
    description: ''
  };

  ngOnInit(): void {
    this.loadPlats();
    this.loadIngredients();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  loadIngredients(): void {
    this.ingredientService.getIngredients().subscribe({
      next: (data) => {
        this.availableIngredients = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement ingrédients', err)
    });
  }

  isIngredientSelected(id?: number | string): boolean {
    if (!id) return false;
    return this.selectedIngredientIds.includes(Number(id));
  }

  toggleIngredient(ingredient: Ingredient): void {
    const id = Number(ingredient.id ?? ingredient.idIngredient);
    if (!id) return;
    const index = this.selectedIngredientIds.indexOf(id);
    if (index > -1) {
      this.selectedIngredientIds.splice(index, 1);
    } else {
      this.selectedIngredientIds.push(id);
    }
    this.syncIngredientPrincipal();
  }

  removeIngredient(id?: number | string): void {
    if (!id) return;
    this.selectedIngredientIds = this.selectedIngredientIds.filter((item) => item !== Number(id));
    this.syncIngredientPrincipal();
  }

  addIngredientFromSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = Number(target.value);
    if (val && !this.selectedIngredientIds.includes(val)) {
      this.selectedIngredientIds.push(val);
      this.syncIngredientPrincipal();
    }
    target.value = '';
  }

  getSelectedIngredientObjects(): Ingredient[] {
    return this.availableIngredients.filter((ing) => {
      const id = Number(ing.id ?? ing.idIngredient);
      return this.selectedIngredientIds.includes(id);
    });
  }

  private syncIngredientPrincipal(): void {
    const names = this.getSelectedIngredientObjects().map((ing) => ing.nom || ing.nomPlat || '');
    this.formData.ingredientPrincipal = names.join(', ');
    this.formData.ingredientIds = [...this.selectedIngredientIds];
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
    this.selectedIngredientIds = [];
    this.formData = {
      nom: '',
      ingredientPrincipal: '',
      ingredientIds: [],
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
    this.selectedIngredientIds = [];
    if (plat.ingredientIds && plat.ingredientIds.length > 0) {
      this.selectedIngredientIds = plat.ingredientIds.map(Number);
    } else if (plat.ingredientPrincipal || (plat.ingredients && plat.ingredients.length > 0)) {
      const names = (plat.ingredients && plat.ingredients.length > 0)
        ? plat.ingredients
        : (plat.ingredientPrincipal ? plat.ingredientPrincipal.split(',').map((s) => s.trim()) : []);
      this.availableIngredients.forEach((ing) => {
        const ingName = (ing.nom || ing.nomPlat || '').toLowerCase().trim();
        if (names.some((n) => n.toLowerCase().trim() === ingName)) {
          const id = Number(ing.id ?? ing.idIngredient);
          if (id && !this.selectedIngredientIds.includes(id)) {
            this.selectedIngredientIds.push(id);
          }
        }
      });
    }

    this.formData = {
      ...plat,
      ingredientIds: [...this.selectedIngredientIds]
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingPlat = null;
    this.router.navigate(['/plats']);
  }

  savePlat(): void {
    if (!this.formData.nom || !this.formData.nom.trim()) {
      alert('Veuillez renseigner le nom du plat.');
      return;
    }

    this.syncIngredientPrincipal();

    const platToSave: Plat = {
      ...this.formData,
      nom: this.formData.nom.trim(),
      description: this.formData.description?.trim() || '',
      ingredientPrincipal: this.formData.ingredientPrincipal || '',
      ingredientIds: [...this.selectedIngredientIds],
      ingredients: this.getSelectedIngredientObjects().map((i) => i.nom || i.nomPlat || '')
    } as Plat;

    if (this.editingPlat && this.editingPlat.id) {
      this.platService.updatePlat(this.editingPlat.id, platToSave).subscribe({
        next: (updated) => {
          const idx = this.plats.findIndex((p) => String(p.id) === String(updated.id));
          if (idx !== -1) {
            this.plats[idx] = updated;
          } else {
            this.loadPlats();
          }
          this.filterPlats();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Erreur modification plat', err);
          alert('Erreur lors de la modification du plat.');
        }
      });
    } else {
      this.platService.createPlat(platToSave).subscribe({
        next: (created) => {
          this.plats.unshift(created);
          this.filterPlats();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Erreur création plat', err);
          alert('Erreur lors de la création du plat.');
        }
      });
    }
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
