import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError, of } from 'rxjs';
import { InfoPratique } from '../models/info-pratique.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Service pour la gestion des informations pratiques du voyageur au Mali.
 * Fournit les opérations CRUD complètes avec gestion des jetons d'authentification.
 */
@Injectable({
  providedIn: 'root'
})
export class InfoPratiqueService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/infos-pratiques`;

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
   * Normalise un objet information pratique reçu de l'API.
   */
  private mapInfoResponse(info: any): InfoPratique {
    if (!info) return info;

    return {
      ...info,
      id: info.id ?? info.idInfoPratique,
      titre: info.titre ?? '',
      categorie: (info.categorie ?? 'VISAS').toUpperCase(),
      ordreAffichage: info.ordreAffichage ?? info.ordre ?? 0,
      ordre: info.ordreAffichage ?? info.ordre ?? 0,
      publie: info.publie ?? info.estPublie ?? true,
      estPublie: info.publie ?? info.estPublie ?? true,
      imageUrl: info.imageUrl ?? info.photoUrl ?? ''
    };
  }

  /**
   * Prépare le payload de requête pour l'envoi vers le backend.
   */
  private preparePayload(info: Partial<InfoPratique>): any {
    const payload: any = { ...info };

    if (payload.ordre !== undefined && payload.ordreAffichage === undefined) {
      payload.ordreAffichage = payload.ordre;
    }

    if (payload.estPublie !== undefined && payload.publie === undefined) {
      payload.publie = payload.estPublie;
    }

    if (payload.categorie) {
      payload.categorie = payload.categorie.toUpperCase();
    }

    return payload;
  }

  /**
   * Récupère toutes les fiches d'informations pratiques (y compris brouillons) pour l'administration.
   */
  getAllInfosPratiques(): Observable<InfoPratique[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`, { headers: this.getAuthHeaders() }).pipe(
      map((list) => (Array.isArray(list) ? list.map((item) => this.mapInfoResponse(item)) : [])),
      catchError((error) => {
        console.warn('API /api/infos-pratiques/all indisponible ou non autorisée, repli sur /api/infos-pratiques :', error);
        return this.getPublishedInfosPratiques();
      })
    );
  }

  /**
   * Récupère uniquement les fiches d'informations pratiques publiées.
   */
  getPublishedInfosPratiques(): Observable<InfoPratique[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((list) => (Array.isArray(list) ? list.map((item) => this.mapInfoResponse(item)) : [])),
      catchError((error) => {
        console.error('Erreur lors de la récupération des infos pratiques publiées :', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère les fiches publiées par catégorie (VISAS, SANTE, DEVISES, CLIMAT, URGENCES).
   */
  getInfosPratiquesByCategorie(categorie: string): Observable<InfoPratique[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorie/${encodeURIComponent(categorie)}`).pipe(
      map((list) => (Array.isArray(list) ? list.map((item) => this.mapInfoResponse(item)) : [])),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des infos de catégorie ${categorie} :`, error);
        return of([]);
      })
    );
  }

  /**
   * Récupère les détails d'une fiche pratique par son identifiant.
   */
  getInfoPratiqueById(id: number | string): Observable<InfoPratique> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((item) => this.mapInfoResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors de la récupération de l'information pratique #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crée une nouvelle fiche d'information pratique.
   */
  createInfoPratique(info: Partial<InfoPratique>): Observable<InfoPratique> {
    const payload = this.preparePayload(info);
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapInfoResponse(item)),
      catchError((error) => {
        console.error('Erreur lors de la création de la fiche pratique :', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Met à jour une fiche d'information pratique existante.
   */
  updateInfoPratique(id: number | string, info: Partial<InfoPratique>): Observable<InfoPratique> {
    const payload = this.preparePayload(info);
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapInfoResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors de la mise à jour de la fiche pratique #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Supprime une fiche d'information pratique.
   */
  deleteInfoPratique(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la suppression de la fiche pratique #${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Bascule l'état de publication d'une fiche d'information pratique.
   */
  togglePublication(id: number | string): Observable<InfoPratique> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-publication`, {}, { headers: this.getAuthHeaders() }).pipe(
      map((item) => this.mapInfoResponse(item)),
      catchError((error) => {
        console.error(`Erreur lors du basculement de publication de la fiche #${id} :`, error);
        return throwError(() => error);
      })
    );
  }
}

