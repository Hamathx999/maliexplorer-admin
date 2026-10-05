import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IngredientService } from '../../services/ingredient.service';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-ingredients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ingredients.component.html',
  styleUrl: './ingredients.component.css'
})
export class IngredientsComponent implements OnInit {
  private readonly ingredientService = inject(IngredientService);

  ingredients: Ingredient[] = [];
  filteredIngredients: Ingredient[] = [];
  searchTerm: string = '';
  selectedCategorie: string = 'TOUTES';

  showModal: boolean = false;
  editingIngredient: Ingredient | null = null;
  formData: Partial<Ingredient> = {
    nom: '',
    categorie: 'Épices & Condiments',
    description: ''
  };

  ngOnInit(): void {
    this.loadIngredients();
  }

  loadIngredients(): void {
    this.ingredientService.getIngredients().subscribe({
      next: (data) => {
        this.ingredients = data;
        this.filterIngredients();
      },
      error: (err) => console.error('Erreur chargement ingrédients', err)
    });
  }

  filterIngredients(): void {
    this.filteredIngredients = this.ingredients.filter((item) => {
      const matchSearch =
        !this.searchTerm ||
        item.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchCat =
        this.selectedCategorie === 'TOUTES' ||
        item.categorie?.toLowerCase() === this.selectedCategorie.toLowerCase();

      return matchSearch && matchCat;
    });
  }

  openAddModal(): void {
    this.editingIngredient = null;
    this.formData = {
      nom: '',
      categorie: 'Épices & Condiments',
      description: ''
    };
    this.showModal = true;
  }

  openEditModal(item: Ingredient): void {
    this.editingIngredient = item;
    this.formData = { ...item };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingIngredient = null;
  }

  saveIngredient(): void {
    if (!this.formData.nom) {
      alert('Veuillez renseigner le nom de l’ingrédient.');
      return;
    }

    if (this.editingIngredient && this.editingIngredient.id) {
      this.ingredientService.updateIngredient(this.editingIngredient.id, this.formData as Ingredient).subscribe({
        next: (updated) => {
          const idx = this.ingredients.findIndex((i) => i.id === updated.id);
          if (idx !== -1) this.ingredients[idx] = updated;
          this.filterIngredients();
          this.closeModal();
        }
      });
    } else {
      this.ingredientService.createIngredient(this.formData as Ingredient).subscribe({
        next: (created) => {
          this.ingredients.unshift(created);
          this.filterIngredients();
          this.closeModal();
        }
      });
    }
  }

  deleteIngredient(item: Ingredient): void {
    if (!item.id) return;
    if (confirm(`Confirmez-vous la suppression de l'ingrédient "${item.nom}" ?`)) {
      this.ingredientService.deleteIngredient(item.id).subscribe({
        next: () => {
          this.ingredients = this.ingredients.filter((i) => i.id !== item.id);
          this.filterIngredients();
        }
      });
    }
  }
}
