import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError, of } from 'rxjs';
import { LangueNationale, LexiqueItem } from '../models/langue.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Service pour la gestion des langues nationales du Mali.
 * Fournit les opérations CRUD complètes avec gestion des jetons d'authentification.
 */
@Injectable({
  providedIn: 'root'
})
export class LangueService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/langues`;

  /**
   * Construit les en-têtes HTTP incluant le jeton d'authentification si disponible.
   */
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.authService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Normalise un objet langue reçu de l'API pour s'assurer que le lexique est parsé.
   */
  private mapLangueResponse(langue: any): LangueNationale {
    if (!langue) return langue;

    let parsedLexique: LexiqueItem[] = [];
    if (Array.isArray(langue.lexique)) {
      parsedLexique = langue.lexique;
    } else if (typeof langue.lexiqueJson === 'string' && langue.lexiqueJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(langue.lexiqueJson);
        if (Array.isArray(parsed)) {
          parsedLexique = parsed;
        }
      } catch (e) {
        console.warn('Impossible de parser le JSON du lexique pour la langue', langue.nom, e);
      }
    }

    return {
      ...langue,
      id: langue.id ?? langue.idLangue,
      nom: langue.nom ?? langue.nomLangue ?? '',
      ordreAffichage: langue.ordreAffichage ?? langue.ordre ?? 0,
      ordre: langue.ordreAffichage ?? langue.ordre ?? 0,
      publie: langue.publie ?? langue.estPublie ?? true,
      estPublie: langue.publie ?? langue.estPublie ?? true,
      imageUrl: langue.imageUrl ?? langue.photoUrl ?? '',
      lexique: parsedLexique
    };
  }

  /**
   * Prépare le payload de requête pour l'envoi vers le backend.
   */
  private preparePayload(langue: Partial<LangueNationale>): any {
    const payload: any = { ...langue };

    if (langue.lexique && Array.isArray(langue.lexique)) {
      payload.lexiqueJson = JSON.stringify(langue.lexique);
    }

    if (payload.ordre !== undefined && payload.ordreAffichage === undefined) {
      payload.ordreAffichage = payload.ordre;
    }

    if (payload.estPublie !== undefined && payload.publie === undefined) {
      payload.publie = payload.estPublie;
    }

    return payload;
  }

  /**
   * Récupère l'intégralité des langues nationales (y compris brouillons) pour l'administration.
   */
  getAllLangues(): Observable<LangueNationale[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`, { headers: this.getAuthHeaders() }).pipe(
      map((list) => (Array.isArray(list) ? list.map((item) => this.mapLangueResponse(item)) : [])),
      catchError((error) => {
        console.warn('API /api/langues/all indisponible ou non autorisée, repli sur /api/langues :', error);
        return this.getPublishedLangues();
      })
    );
  }

  /**
   * Récupère uniquement les langues nationales publiées.
   */
  getPublishedLangues(): Observable<LangueNationale[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((list) => (Array.isArray(list) ? list.map((item) => this.mapLangueResponse(item)) : [])),
      catchError((error) => {
        console.error('Erreur lors de la récupération des langues publiées :', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère les détails d'une langue nationale par son identifiant.
   */
  getLangueById(id: number | string): Observable<LangueNationale> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((item) => this.mapLangueResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors de la récupération de la langue #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crée une nouvelle langue nationale.
   */
  createLangue(langue: Partial<LangueNationale>): Observable<LangueNationale> {
    const payload = this.preparePayload(langue);
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapLangueResponse(item)),
      catchError((error) => {
        console.error('Erreur lors de la création de la langue nationale :', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Met à jour une langue nationale existante.
   */
  updateLangue(id: number | string, langue: Partial<LangueNationale>): Observable<LangueNationale> {
    const payload = this.preparePayload(langue);
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapLangueResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors de la mise à jour de la langue #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Supprime une langue nationale.
   */
  deleteLangue(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la suppression de la langue #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Bascule l'état de publication d'une langue nationale.
   */
  togglePublication(id: number | string): Observable<LangueNationale> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-publication`, {}, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapLangueResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors du basculement de publication de la langue #${id} :`, error);
        return throwError(() => error);
      })
    );
  }
}

