import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { OpportuniteResponseDTO } from '../models/partenaire.model';

/**
 * Service de modération des dossiers et demandes de partenariat.
 * Consomme les endpoints Spring Boot exposés par ModerationPartenaireController.java
 * et OpportuniteController.java.
 */
@Injectable({
  providedIn: 'root'
})
export class ModerationPartenaireService {
  private readonly http = inject(HttpClient);
  private readonly adminApiUrl = `${environment.apiUrl}/admin/moderation/opportunites`;
  private readonly publicApiUrl = `${environment.apiUrl}/opportunites`;

  // Stockage local de secours si le backend est hors ligne en environnement dev
  private readonly STORAGE_KEY = 'maliexplorer_moderation_opportunites';

  private getLocalOpportunites(): OpportuniteResponseDTO[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage opportunites', e);
    }
    return [];
  }

  private saveLocalOpportunites(opps: OpportuniteResponseDTO[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(opps));
    } catch (e) {
      console.warn('Erreur ecriture localStorage opportunites', e);
    }
  }

  /**
   * Récupère la liste des demandes de partenariat en attente de modération administrative.
   * GET /api/admin/moderation/opportunites
   */
  getDemandesEnAttente(): Observable<OpportuniteResponseDTO[]> {
    return this.http.get<OpportuniteResponseDTO[]>(this.adminApiUrl).pipe(
      catchError((error) => {
        console.warn('API modération opportunités non joignable, utilisation des données locales :', error);
        const local = this.getLocalOpportunites();
        const pending = local.filter((o) => o.statutModeration === 'EN_ATTENTE_VALIDATION');
        return of(pending);
      })
    );
  }

  /**
   * Valide un dossier de partenariat (statut passe à VALIDE).
   * PATCH /api/admin/moderation/opportunites/{idUsers}/valider
   */
  validerDemande(idUsers: number): Observable<OpportuniteResponseDTO> {
    return this.http.patch<OpportuniteResponseDTO>(`${this.adminApiUrl}/${idUsers}/valider`, {}).pipe(
      map((res) => {
        this.updateLocalStatus(idUsers, 'VALIDE');
        return res;
      }),
      catchError((error) => {
        console.warn('API validation partenaire hors ligne, mise à jour locale :', error);
        this.updateLocalStatus(idUsers, 'VALIDE');
        return of({
          idUsers,
          nomComplet: 'Partenaire validé',
          email: '',
          statutModeration: 'VALIDE'
        } as OpportuniteResponseDTO);
      })
    );
  }

  /**
   * Rejette un dossier de partenariat avec motif explicatif optionnel.
   * PATCH /api/admin/moderation/opportunites/{idUsers}/rejeter?motif=...
   */
  rejeterDemande(idUsers: number, motif?: string): Observable<OpportuniteResponseDTO> {
    let params = new HttpParams();
    if (motif && motif.trim()) {
      params = params.set('motif', motif.trim());
    }

    return this.http.patch<OpportuniteResponseDTO>(`${this.adminApiUrl}/${idUsers}/rejeter`, {}, { params }).pipe(
      map((res) => {
        this.updateLocalStatus(idUsers, 'REJETE', motif);
        return res;
      }),
      catchError((error) => {
        console.warn('API rejet partenaire hors ligne, mise à jour locale :', error);
        this.updateLocalStatus(idUsers, 'REJETE', motif);
        return of({
          idUsers,
          nomComplet: 'Partenaire rejeté',
          email: '',
          statutModeration: 'REJETE',
          motifRejet: motif
        } as OpportuniteResponseDTO);
      })
    );
  }

  /**
   * Récupère le catalogue public des opportunités validées.
   * GET /api/opportunites
   */
  getOpportunitesValidees(type?: string, query?: string): Observable<OpportuniteResponseDTO[]> {
    let params = new HttpParams();
    if (type && type.trim()) {
      params = params.set('type', type.trim());
    }
    if (query && query.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http.get<OpportuniteResponseDTO[]>(this.publicApiUrl, { params }).pipe(
      catchError(() => {
        const local = this.getLocalOpportunites();
        return of(local.filter((o) => o.statutModeration === 'VALIDE'));
      })
    );
  }

  /**
   * Met à jour le statut dans le stockage local de secours.
   */
  private updateLocalStatus(idUsers: number, status: string, motif?: string): void {
    const local = this.getLocalOpportunites();
    const item = local.find((o) => o.idUsers === idUsers);
    if (item) {
      item.statutModeration = status;
      if (motif) item.motifRejet = motif;
      this.saveLocalOpportunites(local);
    }
  }
}
