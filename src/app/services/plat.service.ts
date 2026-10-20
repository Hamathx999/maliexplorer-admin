import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Plat } from '../models/plat.model';
import { environment } from '../../environments/environment';
import { sanitizeImageUrl, splitImageUrls } from '../utils/image-url.util';

@Injectable({
  providedIn: 'root'
})
export class PlatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/plats`;

  private readonly STORAGE_KEY = 'maliexplorer_plats_custom';

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
    return [];
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

    const rawImages: string[] = [];
    if (Array.isArray(dto.images)) {
      dto.images.forEach((x: any) => {
        const cleaned = sanitizeImageUrl(x);
        if (cleaned && !rawImages.includes(cleaned)) {
          rawImages.push(cleaned);
        }
      });
    }
    const directImageUrl = dto.imageUrl || dto.image_url || dto.image || '';
    if (typeof directImageUrl === 'string' && directImageUrl.trim()) {
      splitImageUrls(directImageUrl).forEach((s) => {
        if (!rawImages.includes(s)) rawImages.push(s);
      });
    }

    const primaryImage = rawImages.length > 0 ? rawImages[0] : sanitizeImageUrl(directImageUrl);

    return {
      id: dto.id ?? dto.idPlat,
      nom: dto.nom ?? dto.nomPlat ?? 'Plat traditionnel',
      description: dto.description || '',
      ingredientPrincipal: principal,
      region: dto.region || (dto.regions && dto.regions.length ? dto.regions.map((r: any) => r.nom || r.nomRegion).join(', ') : 'Mali'),
      tempsPreparation: typeof dto.tempsPreparation === 'number' ? `${dto.tempsPreparation} min` : (dto.tempsPreparation || '45 min'),
      difficulte: dto.difficulte || 'Facile',
      imageUrl: primaryImage,
      images: rawImages.length > 0 ? rawImages : (primaryImage ? [primaryImage] : []),
      ingredients: ingredientNames.length ? ingredientNames : (principal ? principal.split(',').map((s: string) => s.trim()) : []),
      ingredientIds: ingredientIds
    };
  }

  getPlats(): Observable<Plat[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((plats) => (Array.isArray(plats) ? plats.map((p) => this.mapPlat(p)) : [])),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les plats :', error);
        return of([]);
      })
    );
  }

  getPlatById(id: number | string): Observable<Plat> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => this.mapPlat(res)),
      catchError(() => {
        const local = this.getLocalPlats();
        const found = local.find((p) => String(p.id) === String(id));
        return of(found ? this.mapPlat(found) : { id, nom: 'Plat' });
      })
    );
  }

  createPlat(plat: Plat): Observable<Plat> {
    const tempsNum = parseInt(String(plat.tempsPreparation).replace(/\D/g, ''), 10) || 45;
    const imagesList: string[] = [];
    if (Array.isArray(plat.images)) {
      plat.images.forEach((img) => {
        const cleaned = sanitizeImageUrl(img);
        if (cleaned && !imagesList.includes(cleaned)) {
          imagesList.push(cleaned);
        }
      });
    }
    if (plat.imageUrl && typeof plat.imageUrl === 'string' && plat.imageUrl.trim()) {
      splitImageUrls(plat.imageUrl).forEach((s) => {
        if (!imagesList.includes(s)) imagesList.push(s);
      });
    }
    const primaryUrl = imagesList.length > 0 ? imagesList[0] : sanitizeImageUrl(plat.imageUrl);

    const payload = {
      nom: plat.nom,
      description: plat.description,
      imageUrl: primaryUrl,
      images: imagesList,
      image: primaryUrl,
      image_url: primaryUrl,
      ingredientPrincipal: plat.ingredientPrincipal,
      ingredients: plat.ingredientPrincipal,
      ingredientIds: plat.ingredientIds || [],
      tempsPreparation: tempsNum,
      difficulte: plat.difficulte || 'Facile',
      region: plat.region || 'Mali',
      nbrePersonnes: 4
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((res) => this.mapPlat(res)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du plat :', error);
        console.error('Détails précis erreur serveur backend (status ' + error.status + ') :', error.error || error.message);
        const newPlat: Plat = {
          ...plat,
          id: Date.now(),
          imageUrl: primaryUrl,
          images: imagesList
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
    const imagesList: string[] = [];
    if (Array.isArray(plat.images)) {
      plat.images.forEach((img) => {
        const cleaned = sanitizeImageUrl(img);
        if (cleaned && !imagesList.includes(cleaned)) {
          imagesList.push(cleaned);
        }
      });
    }
    if (plat.imageUrl && typeof plat.imageUrl === 'string' && plat.imageUrl.trim()) {
      splitImageUrls(plat.imageUrl).forEach((s) => {
        if (!imagesList.includes(s)) imagesList.push(s);
      });
    }
    const primaryUrl = imagesList.length > 0 ? imagesList[0] : sanitizeImageUrl(plat.imageUrl);

    const payload = {
      nom: plat.nom,
      description: plat.description,
      imageUrl: primaryUrl,
      images: imagesList,
      image: primaryUrl,
      image_url: primaryUrl,
      ingredientPrincipal: plat.ingredientPrincipal,
      ingredients: plat.ingredientPrincipal,
      ingredientIds: plat.ingredientIds || [],
      tempsPreparation: tempsNum,
      difficulte: plat.difficulte || 'Facile',
      region: plat.region || 'Mali',
      nbrePersonnes: 4
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res) => this.mapPlat(res)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du plat :', error);
        console.error('Détails précis erreur serveur backend (status ' + error.status + ') :', error.error || error.message);
        const current = this.getLocalPlats();
        const index = current.findIndex((p) => String(p.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...plat, id, imageUrl: primaryUrl, images: imagesList };
          this.saveLocalPlats(current);
        }
        return of({ ...plat, id, imageUrl: primaryUrl, images: imagesList });
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
