import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap, throwError } from 'rxjs';
import { Ville } from '../models/ville.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VilleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/villes`;

  private readonly STORAGE_KEY = 'maliexplorer_villes_custom';

  private getLocalVilles(): Ville[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage villes', e);
    }
    return [];
  }

  private saveLocalVilles(villes: Ville[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(villes));
    } catch (e) {
      console.warn('Erreur écriture localStorage villes', e);
    }
  }

  getVilles(): Observable<Ville[]> {
    return this.http.get<Ville[]>(this.apiUrl).pipe(
      tap((villes) => {
        if (Array.isArray(villes) && villes.length > 0) {
          this.saveLocalVilles(villes);
        }
      }),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les villes, utilisation du stockage local :', error);
        return of(this.getLocalVilles());
      })
    );
  }

  getHomeVilles(): Observable<Ville[]> {
    return this.http.get<Ville[]>(`${this.apiUrl}/home`).pipe(
      catchError(() => {
        return of(this.getLocalVilles().filter(v => v.misEnAvantHome));
      })
    );
  }

  getVillesByRegion(regionName: string): Observable<Ville[]> {
    return this.http.get<Ville[]>(`${this.apiUrl}?region=${encodeURIComponent(regionName)}`).pipe(
      catchError(() => {
        return of(this.getLocalVilles().filter((v) => v.region.toLowerCase().includes(regionName.toLowerCase())));
      })
    );
  }

  getVilleById(id: number | string): Observable<Ville> {
    return this.http.get<Ville>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalVilles();
        const found = local.find((v) => String(v.id) === String(id));
        return of(found ?? { id, nom: 'Ville', region: 'Mali' });
      })
    );
  }

  createVille(ville: Ville): Observable<Ville> {
    return this.http.post<Ville>(this.apiUrl, ville).pipe(
      tap((created) => {
        const current = this.getLocalVilles();
        current.unshift(created);
        this.saveLocalVilles(current);
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la création de la ville :', error);
        return throwError(() => error);
      })
    );
  }

  updateVille(id: number | string, ville: Ville): Observable<Ville> {
    return this.http.put<Ville>(`${this.apiUrl}/${id}`, ville).pipe(
      tap((updated) => {
        const current = this.getLocalVilles();
        const index = current.findIndex((v) => String(v.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...updated };
          this.saveLocalVilles(current);
        }
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la mise à jour de la ville :', error);
        return throwError(() => error);
      })
    );
  }

  deleteVille(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.getLocalVilles().filter((v) => String(v.id) !== String(id));
        this.saveLocalVilles(current);
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la suppression de la ville :', error);
        return throwError(() => error);
      })
    );
  }
}
