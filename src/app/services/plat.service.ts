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

  private readonly STORAGE_KEY = 'maliexplorer_plats_custom';

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
      description: 'Sauce noire emblématique de Tombouctou et Gao à base de corète potagère séchée.',
      region: 'Tombouctou, Gao',
      tempsPreparation: '90 min',
      difficulte: 'Moyenne'
    },
    {
      id: 3,
      nom: 'Widjila',
      ingredientPrincipal: 'Farine de blé & levure',
      description: 'Pains traditionnels cuits à la vapeur sur les rives du fleuve Niger.',
      region: 'Mopti, Tombouctou',
      tempsPreparation: '45 min',
      difficulte: 'Facile'
    },
    {
      id: 4,
      nom: 'Djouka',
      ingredientPrincipal: 'Fonio & poudre d\'arachides',
      description: "Mets raffiné à base de fonio précuit et de poudre d'arachides grillées au goût fumé.",
      region: 'Sikasso, Ségou',
      tempsPreparation: '40 min',
      difficulte: 'Facile'
    },
    {
      id: 5,
      nom: 'Mafé',
      ingredientPrincipal: 'Viande de bœuf & légumes frais',
      description: "Ragoût onctueux mijoté avec viande de bœuf tendre, carottes, manioc et chou.",
      region: 'Toutes régions',
      tempsPreparation: '70 min',
      difficulte: 'Moyenne'
    },
    {
      id: 6,
      nom: 'Saga Saga',
      ingredientPrincipal: 'Feuilles de patate douce',
      description: 'Sauce verte aux jeunes pousses de patate douce, relevée au poisson fumé.',
      region: 'Koulikoro, Bamako',
      tempsPreparation: '50 min',
      difficulte: 'Facile'
    }
  ];

  private getLocalPlats(): Plat[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage plats', e);
    }
    return [...this.fallbackPlats];
  }

  private saveLocalPlats(plats: Plat[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plats));
    } catch (e) {
      console.warn('Erreur écriture localStorage plats', e);
    }
  }

  private mapPlat(dto: any): Plat {
    const ingredientNames: string[] = [];
    const ingredientIds: number[] = [];

    if (Array.isArray(dto.ingredientModelList)) {
      dto.ingredientModelList.forEach((ing: any) => {
        const id = ing.idIngredient ?? ing.id;
        if (id) ingredientIds.push(Number(id));
        const name = ing.nom || ing.nomPlat;
        if (name && !ingredientNames.includes(name)) ingredientNames.push(name);
      });
    }

    if (Array.isArray(dto.ingredients)) {
      dto.ingredients.forEach((ing: any) => {
        if (typeof ing === 'string') {
          if (!ingredientNames.includes(ing)) ingredientNames.push(ing);
        } else if (ing) {
          const name = ing.nom || ing.nomPlat;
          if (name && !ingredientNames.includes(name)) ingredientNames.push(name);
          const id = ing.idIngredient ?? ing.id;
          if (id) ingredientIds.push(Number(id));
        }
      });
    }

    if (Array.isArray(dto.ingredientIds)) {
      dto.ingredientIds.forEach((id: any) => {
        const num = Number(id);
        if (!ingredientIds.includes(num)) ingredientIds.push(num);
      });
    }

    const principal = dto.ingredientPrincipal || ingredientNames.join(', ') || '';

    return {
      id: dto.id ?? dto.idPlat,
      nom: dto.nom ?? dto.nomPlat ?? 'Plat traditionnel',
      description: dto.description || '',
      ingredientPrincipal: principal,
      region: dto.region || (dto.regions && dto.regions.length ? dto.regions.map((r: any) => r.nom || r.nomRegion).join(', ') : 'Mali'),
      tempsPreparation: typeof dto.tempsPreparation === 'number' ? `${dto.tempsPreparation} min` : (dto.tempsPreparation || '45 min'),
      difficulte: dto.difficulte || 'Facile',
      imageUrl: dto.imageUrl || '',
      ingredients: ingredientNames.length ? ingredientNames : (principal ? principal.split(',').map((s: string) => s.trim()) : []),
      ingredientIds: ingredientIds
    };
  }

  getPlats(): Observable<Plat[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les plats, utilisation du stockage local :', error);
        return of(this.getLocalPlats());
      })
    );
  }

  getPlatById(id: number | string): Observable<Plat> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalPlats();
        const found = local.find((p) => String(p.id) === String(id));
        return of(found ? this.mapPlat(found) : { id, nom: 'Plat' });
      })
    );
  }

  createPlat(plat: Plat): Observable<Plat> {
    const tempsNum = parseInt(String(plat.tempsPreparation).replace(/\D/g, ''), 10) || 45;
    const payload = {
      nom: plat.nom,
      description: plat.description,
      ingredientPrincipal: plat.ingredientPrincipal,
      ingredients: plat.ingredientPrincipal,
      ingredientIds: plat.ingredientIds || [],
      tempsPreparation: tempsNum,
      difficulte: plat.difficulte || 'Facile',
      region: plat.region || 'Mali',
      nbrePersonnes: 4
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du plat :', error);
        const newPlat: Plat = {
          ...plat,
          id: Date.now()
        };
        const current = this.getLocalPlats();
        current.unshift(newPlat);
        this.saveLocalPlats(current);
        return of(newPlat);
      })
    );
  }

  updatePlat(id: number | string, plat: Plat): Observable<Plat> {
    const tempsNum = parseInt(String(plat.tempsPreparation).replace(/\D/g, ''), 10) || 45;
    const payload = {
      nom: plat.nom,
      description: plat.description,
      ingredientPrincipal: plat.ingredientPrincipal,
      ingredients: plat.ingredientPrincipal,
      ingredientIds: plat.ingredientIds || [],
      tempsPreparation: tempsNum,
      difficulte: plat.difficulte || 'Facile',
      region: plat.region || 'Mali',
      nbrePersonnes: 4
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du plat :', error);
        const current = this.getLocalPlats();
        const index = current.findIndex((p) => String(p.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...plat, id };
          this.saveLocalPlats(current);
        }
        return of({ ...plat, id });
      })
    );
  }

  deletePlat(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du plat :', error);
        const current = this.getLocalPlats().filter((p) => String(p.id) !== String(id));
        this.saveLocalPlats(current);
        return of(void 0);
      })
    );
  }
}
