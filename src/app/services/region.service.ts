import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Region } from '../models/region.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RegionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/regions`;

  private readonly STORAGE_KEY = 'maliexplorer_regions_custom';

  private getLocalRegions(): Region[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage regions', e);
    }
    return [];
  }

  private saveLocalRegions(regions: Region[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(regions));
    } catch (e) {
      console.warn('Erreur écriture localStorage regions', e);
    }
  }

  getRegions(): Observable<Region[]> {
    return this.http.get<Region[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les régions :', error);
        return of([]);
      })
    );
  }

  getRegionById(id: number | string): Observable<Region> {
    return this.http.get<Region>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalRegions();
        const found = local.find((r) => String(r.id) === String(id));
        return of(found ?? { id, nom: 'Région' });
      })
    );
  }

  createRegion(region: Region): Observable<Region> {
    return this.http.post<Region>(this.apiUrl, region).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local région :', error);
        const newRegion: Region = {
          ...region,
          id: Date.now()
        };
        const current = this.getLocalRegions();
        current.unshift(newRegion);
        this.saveLocalRegions(current);
        return of(newRegion);
      })
    );
  }

  updateRegion(id: number | string, region: Region): Observable<Region> {
    return this.http.put<Region>(`${this.apiUrl}/${id}`, region).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale région :', error);
        const current = this.getLocalRegions();
        const index = current.findIndex((r) => String(r.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...region, id };
          this.saveLocalRegions(current);
        }
        return of({ ...region, id });
      })
    );
  }

  deleteRegion(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale région :', error);
        const current = this.getLocalRegions().filter((r) => String(r.id) !== String(id));
        this.saveLocalRegions(current);
        return of(void 0);
      })
    );
  }
}
