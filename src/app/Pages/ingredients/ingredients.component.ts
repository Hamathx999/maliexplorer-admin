import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { IngredientService } from '../../services/ingredient.service';
import { DialogService } from '../../services/dialog.service';
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
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ingredients: Ingredient[] = [];
  filteredIngredients: Ingredient[] = [];
  searchTerm: string = '';

  isEditing: boolean = false;
  editingIngredient: Ingredient | null = null;
  formData: Partial<Ingredient> = {
    nom: '',
    categorie: 'Épices & Condiments',
    description: ''
  };

  ngOnInit(): void {
    this.loadIngredients();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/ingredients/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingIngredient && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadIngredients(): void {
    this.ingredientService.getIngredients().subscribe({
      next: (data) => {
        this.ingredients = (data || []).map((item) => {
          const resolvedId = item.id ?? item.idIngredient;
          return {
            ...item,
            id: resolvedId,
            nom: item.nom || item.nomPlat || ''
          };
        });
        this.filterIngredients();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement ingrédients', err)
    });
  }

  filterIngredients(): void {
    this.filteredIngredients = this.ingredients.filter((item) => {
      return (
        !this.searchTerm ||
        item.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    });
  }

  startAdd(): void {
    this.editingIngredient = null;
    this.formData = {
      nom: '',
      categorie: 'Épices & Condiments',
      description: ''
    };
    this.isEditing = true;
    this.router.navigate(['/ingredients/ajouter']);
  }

  startEdit(item: Ingredient): void {
    const resolvedId = item.id ?? item.idIngredient;
    this.editingIngredient = { ...item, id: resolvedId };
    this.formData = { ...item, id: resolvedId };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingIngredient = null;
    this.router.navigate(['/ingredients']);
    this.cdr.detectChanges();
  }

  saveIngredient(): void {
    const cleanNom = (this.formData.nom || '').trim();
    if (!cleanNom) {
      alert('Veuillez renseigner le nom de l’ingrédient.');
      return;
    }

    const editId = this.editingIngredient?.id ?? this.editingIngredient?.idIngredient ?? this.formData.id ?? this.formData.idIngredient;

    const payload: Ingredient = {
      ...this.formData,
      nom: cleanNom,
      nomPlat: cleanNom
    };

    if (editId) {
      this.ingredientService.updateIngredient(editId, payload).subscribe({
        next: (updated) => {
          const updatedId = updated.id ?? updated.idIngredient ?? editId;
          const normalizedUpdated: Ingredient = {
            ...updated,
            id: updatedId,
            nom: updated.nom || updated.nomPlat || cleanNom
          };
          const idx = this.ingredients.findIndex((i) => String(i.id ?? i.idIngredient) === String(updatedId));
          if (idx !== -1) {
            this.ingredients[idx] = normalizedUpdated;
          } else {
            this.loadIngredients();
          }
          this.filterIngredients();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur modification ingrédient :', err);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.ingredientService.createIngredient(payload).subscribe({
        next: (created) => {
          const createdId = created.id ?? created.idIngredient;
          const normalizedCreated: Ingredient = {
            ...created,
            id: createdId,
            nom: created.nom || created.nomPlat || cleanNom
          };
          this.ingredients.unshift(normalizedCreated);
          this.filterIngredients();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur création ingrédient :', err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  async deleteIngredient(item: Ingredient): Promise<void> {
    const idToDelete = item.id ?? item.idIngredient;
    if (!idToDelete) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer l\'ingrédient',
      message: `Confirmez-vous la suppression de l'ingrédient "${item.nom}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.ingredientService.deleteIngredient(idToDelete).subscribe({
      next: () => {
        this.ingredients = this.ingredients.filter((i) => String(i.id ?? i.idIngredient) !== String(idToDelete));
        this.filterIngredients();
        this.dialogService.toastSuccess(`Ingrédient "${item.nom}" supprimé.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.dialogService.toastError('Impossible de supprimer cet ingrédient.');
        this.cdr.detectChanges();
      }
    });
  }
}
