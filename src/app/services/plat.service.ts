import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Plat } from '../models/plat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/plats`;

  private fallbackPlats: Plat[] = [
    {
      id: 1,
      nom: 'Tigadèguè Na',
      ingredientPrincipal: 'Pâte d\'arachide (Tiga)',
      description: "La fameuse sauce d'arachide malienne, traditionnellement servie avec du riz ou du tô.",
      region: 'Ségou, Koulikoro',
      tempsPreparation: '60 min',
      difficulte: 'Facile'
    },
    {
      id: 2,
      nom: 'Fakoye',
      ingredientPrincipal: 'Feuilles de Corète séchées (Fakoye)',
      description: 'Sauce noire originaire du nord du Mali à base de feuilles de corète potagère séchées.',
      region: 'Tombouctou, Gao',
      tempsPreparation: '90 min',
      difficulte: 'Moyenne'
    },
    {
      id: 3,
      nom: 'Widjila',
      ingredientPrincipal: 'Farine de blé & levure',
      description: 'Boulettes de pain cuites à la vapeur, idéales pour accompagner les sauces riches.',
      region: 'Mopti, Tombouctou',
      tempsPreparation: '45 min',
      difficulte: 'Facile'
    },
    {
      id: 4,
      nom: 'Djouka',
      ingredientPrincipal: 'Fonio & poudre d\'arachides',
      description: "Plat traditionnel composé de fonio et de poudre d'arachides grillées.",
      region: 'Sikasso, Ségou',
      tempsPreparation: '40 min',
      difficulte: 'Facile'
    },
    {
      id: 5,
      nom: 'Mafé',
      ingredientPrincipal: 'Viande de bœuf & pâte d\'arachide',
      description: "Un ragoût onctueux à la pâte d'arachide mijoté avec des légumes et de la viande.",
      region: 'Toutes régions',
      tempsPreparation: '70 min',
      difficulte: 'Moyenne'
    },
    {
      id: 6,
      nom: 'Saga Saga',
      ingredientPrincipal: 'Feuilles de patate douce',
      description: 'Sauce malienne parfumée aux feuilles de patate douce cuites lentement.',
      region: 'Koulikoro, Bamako',
      tempsPreparation: '50 min',
      difficulte: 'Facile'
    }
  ];

  getPlats(): Observable<Plat[]> {
    return this.http.get<Plat[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les plats, utilisation du cache local :', error);
        return of(this.fallbackPlats);
      })
    );
  }

  getPlatById(id: number | string): Observable<Plat> {
    return this.http.get<Plat>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackPlats.find((p) => p.id === id);
        return of(found ?? { id, nom: 'Plat' });
      })
    );
  }

  createPlat(plat: Plat): Observable<Plat> {
    return this.http.post<Plat>(this.apiUrl, plat).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du plat :', error);
        const newPlat: Plat = {
          ...plat,
          id: Date.now()
        };
        this.fallbackPlats.unshift(newPlat);
        return of(newPlat);
      })
    );
  }

  updatePlat(id: number | string, plat: Plat): Observable<Plat> {
    return this.http.put<Plat>(`${this.apiUrl}/${id}`, plat).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du plat :', error);
        const index = this.fallbackPlats.findIndex((p) => p.id === id);
        if (index !== -1) {
          this.fallbackPlats[index] = { ...this.fallbackPlats[index], ...plat, id };
        }
        return of({ ...plat, id });
      })
    );
  }

  deletePlat(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du plat :', error);
        this.fallbackPlats = this.fallbackPlats.filter((p) => p.id !== id);
        return of(void 0);
      })
    );
  }
}
