import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Ingredient } from '../models/ingredient.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ingredients`;

  private readonly STORAGE_KEY = 'maliexplorer_ingredients_custom';

  private fallbackIngredients: Ingredient[] = [
    { id: 1, nom: "Pâte d'arachide (Tiga)", categorie: 'Condiments & Pâtes', description: 'Base du Tiga Dèguè Na, issue d’arachides grillées et broyées traditionnellement.' },
    { id: 2, nom: "Feuilles de Corète séchées (Fakoye)", categorie: 'Herbes & Feuilles', description: 'Feuilles séchées indispensables au Fakoye de Tombouctou et Gao.' },
    { id: 3, nom: "Soumbala (Néré fermenté)", categorie: 'Épices & Aromates', description: 'Condiment ancestral malien préparé à base de graines de néré cuites et fermentées.' },
    { id: 4, nom: "Fonio blanc (Finyo)", categorie: 'Céréales', description: 'Céréale sahélienne millénaire, légère, sans gluten et riche en minéraux.' },
    { id: 5, nom: "Feuilles de Baobab (Zira)", categorie: 'Herbes & Feuilles', description: 'Poudre de jeunes feuilles de baobab séchées pour lier les sauces traditionnelles.' },
    { id: 6, nom: "Poisson capitaine fumé", categorie: 'Poissons', description: 'Poisson noble du fleuve Niger fumé au bois aromatique.' },
    { id: 7, nom: "Feuilles de patate douce", categorie: 'Légumes & Feuilles', description: 'Ingrédient végétal principal de la fameuse sauce Saga Saga.' },
    { id: 8, nom: "Gombo séché (Moulé)", categorie: 'Légumes', description: 'Gombo déshydraté et pilé servant d’épaississant naturel.' },
    { id: 9, nom: "Tamarin sauvage (Tomi)", categorie: 'Fruits & Condiments', description: 'Pulpe acidulée utilisée pour parfumer sauces aigres-douces et boissons.' }
  ];

  private getLocalIngredients(): Ingredient[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage ingredients', e);
    }
    return [...this.fallbackIngredients];
  }

  private saveLocalIngredients(ingredients: Ingredient[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ingredients));
    } catch (e) {
      console.warn('Erreur écriture localStorage ingredients', e);
    }
  }

  getIngredients(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les ingrédients, utilisation du stockage local :', error);
        return of(this.getLocalIngredients());
      })
    );
  }

  getIngredientById(id: number | string): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalIngredients();
        const found = local.find((i) => String(i.id) === String(id));
        return of(found ?? { id, nom: 'Ingrédient traditionnel' });
      })
    );
  }

  createIngredient(ingredient: Ingredient): Observable<Ingredient> {
    return this.http.post<Ingredient>(this.apiUrl, ingredient).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local ingrédient :', error);
        const newIng: Ingredient = {
          ...ingredient,
          id: Date.now()
        };
        const current = this.getLocalIngredients();
        current.unshift(newIng);
        this.saveLocalIngredients(current);
        return of(newIng);
      })
    );
  }

  updateIngredient(id: number | string, ingredient: Ingredient): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.apiUrl}/${id}`, ingredient).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale ingrédient :', error);
        const current = this.getLocalIngredients();
        const index = current.findIndex((i) => String(i.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...ingredient, id };
          this.saveLocalIngredients(current);
        }
        return of({ ...ingredient, id });
      })
    );
  }

  deleteIngredient(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale ingrédient :', error);
        const current = this.getLocalIngredients().filter((i) => String(i.id) !== String(id));
        this.saveLocalIngredients(current);
        return of(void 0);
      })
    );
  }
}
