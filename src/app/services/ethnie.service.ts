import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Ethnie } from '../models/ethnie.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EthnieService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ethnies`;

  private readonly STORAGE_KEY = 'maliexplorer_ethnies_custom';

  private getLocalEthnies(): Ethnie[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage ethnies', e);
    }
    return [];
  }

  private saveLocalEthnies(ethnies: Ethnie[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ethnies));
    } catch (e) {
      console.warn('Erreur écriture localStorage ethnies', e);
    }
  }

  getEthnies(): Observable<Ethnie[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((data: any[]) =>
        Array.isArray(data)
          ? data.map((e) => ({
              ...e,
              id: e.id ?? e.idEthnie,
              nom: e.nom ?? e.nomEthnie ?? 'Ethnie'
            }))
          : []
      ),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les ethnies :', error);
        return of([]);
      })
    );
  }

  getEthnieById(id: number | string): Observable<Ethnie> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((e: any) => ({
        ...e,
        id: e.id ?? e.idEthnie,
        nom: e.nom ?? e.nomEthnie ?? 'Ethnie inconnue'
      })),
      catchError(() => {
        const local = this.getLocalEthnies();
        const found = local.find((e) => String(e.id) === String(id));
        return of(found ?? { id, nom: 'Ethnie inconnue', langues: 'Français' });
      })
    );
  }

  createEthnie(ethnie: Ethnie): Observable<Ethnie> {
    return this.http.post<Ethnie>(this.apiUrl, ethnie).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de l’ethnie :', error);
        const newEthnie: Ethnie = {
          ...ethnie,
          id: Date.now()
        };
        const current = this.getLocalEthnies();
        current.unshift(newEthnie);
        this.saveLocalEthnies(current);
        return of(newEthnie);
      })
    );
  }

  updateEthnie(id: number | string, ethnie: Ethnie): Observable<Ethnie> {
    return this.http.put<Ethnie>(`${this.apiUrl}/${id}`, ethnie).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de l’ethnie :', error);
        const current = this.getLocalEthnies();
        const index = current.findIndex((e) => String(e.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...ethnie, id };
          this.saveLocalEthnies(current);
        }
        return of({ ...ethnie, id });
      })
    );
  }

  deleteEthnie(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de l’ethnie :', error);
        const current = this.getLocalEthnies().filter((e) => String(e.id) !== String(id));
        this.saveLocalEthnies(current);
        return of(void 0);
      })
    );
  }
}
