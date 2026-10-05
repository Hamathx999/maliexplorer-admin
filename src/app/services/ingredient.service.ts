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

  private fallbackIngredients: Ingredient[] = [
    { id: 1, nom: "Pâte d'arachide (Tiga)", categorie: 'Condiments & Pâtes', description: 'Base du Tiga Dèguè Na, issue d’arachides grillées et broyées.' },
    { id: 2, nom: "Feuilles de Corète séchées (Fakoye)", categorie: 'Herbes & Feuilles', description: 'Feuilles séchées traditionnelles servant à la préparation du Fakoye du Nord.' },
    { id: 3, nom: "Fonio", categorie: 'Céréales', description: 'Céréale sahélienne ancestrale, légère et digeste, base du Djouka.' },
    { id: 4, nom: "Banane plantain (Aloco)", categorie: 'Fruits & Féculents', description: 'Banane à cuire frite ou bouillie en accompagnement.' },
    { id: 5, nom: "Poisson capitaine", categorie: 'Poissons', description: 'Grand poisson d’eau douce très prisé du fleuve Niger.' },
    { id: 6, nom: "Feuilles de patate douce", categorie: 'Légumes & Feuilles', description: 'Ingrédient principal de la sauce Saga Saga.' },
    { id: 7, nom: "Gombo séché", categorie: 'Légumes', description: 'Gombo moulu pour épaissir et donner de la texture aux sauces.' },
    { id: 8, nom: "Piment rouge", categorie: 'Épices', description: 'Condiment piquant incontournable des ragoûts maliens.' }
  ];

  getIngredients(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les ingrédients, utilisation du cache local :', error);
        return of(this.fallbackIngredients);
      })
    );
  }

  getIngredientById(id: number | string): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackIngredients.find((i) => i.id === id);
        return of(found ?? { id, nom: 'Ingrédient' });
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
        this.fallbackIngredients.unshift(newIng);
        return of(newIng);
      })
    );
  }

  updateIngredient(id: number | string, ingredient: Ingredient): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.apiUrl}/${id}`, ingredient).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale ingrédient :', error);
        const index = this.fallbackIngredients.findIndex((i) => i.id === id);
        if (index !== -1) {
          this.fallbackIngredients[index] = { ...this.fallbackIngredients[index], ...ingredient, id };
        }
        return of({ ...ingredient, id });
      })
    );
  }

  deleteIngredient(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale ingrédient :', error);
        this.fallbackIngredients = this.fallbackIngredients.filter((i) => i.id !== id);
        return of(void 0);
      })
    );
  }
}
