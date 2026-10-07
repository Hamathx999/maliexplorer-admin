import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Evenement } from '../models/evenement.model';
import { environment } from '../../environments/environment';

/**
 * Événements — données 100 % issues de Spring Boot (/api/evenements).
 * Les lectures renvoient une liste vide en cas d'erreur réseau,
 * les actions (création, validation, rejet...) remontent l'erreur au composant.
 */
@Injectable({ providedIn: 'root' })
export class EvenementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/evenements`;

  getEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(this.apiUrl).pipe(
      catchError((err) => {
        console.error('Chargement des événements impossible :', err);
        return of([]);
      })
    );
  }

  getPendingEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(`${this.apiUrl}/en-attente`).pipe(
      catchError((err) => {
        console.error('Chargement des événements en attente impossible :', err);
        return of([]);
      })
    );
  }

  getEvenementById(id: number | string): Observable<Evenement> {
    return this.http.get<Evenement>(`${this.apiUrl}/${id}`);
  }

  createEvenement(evenement: Evenement): Observable<Evenement> {
    return this.http.post<Evenement>(this.apiUrl, evenement);
  }

  updateEvenement(id: number | string, evenement: Evenement): Observable<Evenement> {
    return this.http.put<Evenement>(`${this.apiUrl}/${id}`, evenement);
  }

  approveEvenement(id: number | string): Observable<Evenement> {
    return this.http.patch<Evenement>(`${this.apiUrl}/${id}/approuver`, {});
  }

  rejectEvenement(id: number | string, motif?: string): Observable<Evenement> {
    return this.http.patch<Evenement>(`${this.apiUrl}/${id}/rejeter`, { motif });
  }

  deleteEvenement(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
