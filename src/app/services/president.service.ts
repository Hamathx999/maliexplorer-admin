import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, tap, throwError } from 'rxjs';
import { President } from '../models/president.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PresidentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/presidents`;

  private readonly STORAGE_KEY = 'maliexplorer_presidents_custom';

  private getLocalPresidents(): President[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage presidents', e);
    }
    return [];
  }

  private saveLocalPresidents(presidents: President[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presidents));
    } catch (e) {
      console.warn('Erreur écriture localStorage presidents', e);
    }
  }

  getPresidents(): Observable<President[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((data: any[]) =>
        data.map((p) => ({
          ...p,
          id: p.id ?? p.idPresident,
          periode: p.periodeMandat || p.periode || '',
          periodeMandat: p.periodeMandat || p.periode || ''
        }))
      ),
      tap((presidents) => {
        if (Array.isArray(presidents) && presidents.length > 0) {
          this.saveLocalPresidents(presidents);
        }
      }),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les présidents :', error);
        return of([]);
      })
    );
  }

  getPresidentById(id: number | string): Observable<President> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((p: any) => ({
        ...p,
        id: p.id ?? p.idPresident,
        periode: p.periodeMandat || p.periode || '',
        periodeMandat: p.periodeMandat || p.periode || ''
      })),
      catchError(() => {
        const local = this.getLocalPresidents();
        const found = local.find((p) => String(p.id) === String(id));
        return of(found ?? { id, nom: 'Chef d\'État' });
      })
    );
  }

  createPresident(president: President): Observable<President> {
    const payload: President = {
      ...president,
      periodeMandat: president.periodeMandat || president.periode,
      periode: president.periodeMandat || president.periode
    };
    return this.http.post<President>(this.apiUrl, payload).pipe(
      map((created: President) => ({
        ...created,
        periode: created.periodeMandat || created.periode || '',
        periodeMandat: created.periodeMandat || created.periode || ''
      })),
      tap((newPres) => {
        const current = this.getLocalPresidents();
        current.unshift(newPres);
        this.saveLocalPresidents(current);
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la création du président :', error);
        return throwError(() => error);
      })
    );
  }

  updatePresident(id: number | string, president: President): Observable<President> {
    const payload: President = {
      ...president,
      periodeMandat: president.periodeMandat || president.periode,
      periode: president.periodeMandat || president.periode
    };
    return this.http.put<President>(`${this.apiUrl}/${id}`, payload).pipe(
      map((updated: President) => ({
        ...updated,
        periode: updated.periodeMandat || updated.periode || '',
        periodeMandat: updated.periodeMandat || updated.periode || ''
      })),
      tap((updated) => {
        const current = this.getLocalPresidents();
        const index = current.findIndex((p) => String(p.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...updated, id };
          this.saveLocalPresidents(current);
        }
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la mise à jour du président :', error);
        return throwError(() => error);
      })
    );
  }

  deletePresident(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.getLocalPresidents().filter((p) => String(p.id) !== String(id));
        this.saveLocalPresidents(current);
      }),
      catchError((error) => {
        console.error('Erreur API Spring Boot lors de la suppression du président :', error);
        return throwError(() => error);
      })
    );
  }
}
