import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { OpportuniteResponseDTO } from '../models/partenaire.model';

/**
 * Service de modération des dossiers et demandes de partenariat.
 * Consomme les endpoints Spring Boot exposés par ModerationPartenaireController.java
 * et OpportuniteController.java, et maintient un compteur réactif des demandes en attente.
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

  // Compteur réactif des demandes de partenariat en attente (pour le badge de la sidebar)
  private readonly pendingCountSubject = new BehaviorSubject<number>(0);
  readonly pendingCount$ = this.pendingCountSubject.asObservable();
  readonly pendingCount = signal<number>(0);

  private setPendingCount(count: number): void {
    const safeCount = Math.max(0, count);
    this.pendingCount.set(safeCount);
    this.pendingCountSubject.next(safeCount);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getLocalOpportunites(): OpportuniteResponseDTO[] {
    if (!this.isBrowser()) return [];
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
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(opps));
    } catch (e) {
      console.warn('Erreur ecriture localStorage opportunites', e);
    }
  }

  /**
   * Rafraîchit silencieusement le compteur des demandes en attente depuis l'API
   * (exécuté uniquement côté navigateur pour éviter les requêtes lors du build SSR).
   */
  refreshPendingCount(): void {
    if (!this.isBrowser()) return;
    this.getDemandesEnAttente().subscribe();
  }

  /**
   * Récupère la liste des demandes de partenariat en attente de modération administrative.
   * GET /api/admin/moderation/opportunites?statut=EN_ATTENTE_VALIDATION
   */
  getDemandesEnAttente(): Observable<OpportuniteResponseDTO[]> {
    const params = new HttpParams().set('statut', 'EN_ATTENTE_VALIDATION');
    return this.http.get<OpportuniteResponseDTO[]>(this.adminApiUrl, { params }).pipe(
      tap((list) => {
        const items = Array.isArray(list) ? list : [];
        this.setPendingCount(items.length);
      }),
      catchError((error) => {
        console.warn('API modération opportunités non joignable, utilisation des données locales :', error);
        const local = this.getLocalOpportunites();
        const pending = local.filter(
          (o) => o.statutModeration === 'EN_ATTENTE_VALIDATION' || o.statutModeration === 'EN_ATTENTE'
        );
        this.setPendingCount(pending.length);
        return of(pending);
      })
    );
  }

  /**
   * Récupère les dossiers de partenariat validés.
   * GET /api/admin/moderation/opportunites?statut=VALIDE
   */
  getDemandesValidees(): Observable<OpportuniteResponseDTO[]> {
    const params = new HttpParams().set('statut', 'VALIDE');
    return this.http.get<OpportuniteResponseDTO[]>(this.adminApiUrl, { params }).pipe(
      catchError((error) => {
        console.warn('API modération dossiers validés non joignable, fallback :', error);
        const local = this.getLocalOpportunites();
        return of(local.filter((o) => o.statutModeration === 'VALIDE'));
      })
    );
  }

  /**
   * Récupère les dossiers de partenariat rejetés.
   * GET /api/admin/moderation/opportunites?statut=REJETE
   */
  getDemandesRejetees(): Observable<OpportuniteResponseDTO[]> {
    const params = new HttpParams().set('statut', 'REJETE');
    return this.http.get<OpportuniteResponseDTO[]>(this.adminApiUrl, { params }).pipe(
      catchError((error) => {
        console.warn('API modération dossiers rejetés non joignable, fallback :', error);
        const local = this.getLocalOpportunites();
        return of(local.filter((o) => o.statutModeration === 'REJETE'));
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
        this.setPendingCount(this.pendingCount() - 1);
        return res;
      }),
      catchError((error) => {
        console.warn('API validation partenaire hors ligne, mise à jour locale :', error);
        this.updateLocalStatus(idUsers, 'VALIDE');
        this.setPendingCount(this.pendingCount() - 1);
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
   * Rejette un dossier de partenariat avec motif explicatif.
   * PATCH /api/admin/moderation/opportunites/{idUsers}/rejeter?motif=...
   */
  rejeterDemande(idUsers: number, motif?: string): Observable<OpportuniteResponseDTO> {
    let params = new HttpParams();
    const cleanMotif = motif && motif.trim() ? motif.trim() : 'Dossier non conforme ou incomplet';
    params = params.set('motif', cleanMotif);
    const body = { motif: cleanMotif, motifRejet: cleanMotif };

    return this.http.patch<OpportuniteResponseDTO>(`${this.adminApiUrl}/${idUsers}/rejeter`, body, { params }).pipe(
      map((res) => {
        this.updateLocalStatus(idUsers, 'REJETE', cleanMotif);
        this.setPendingCount(this.pendingCount() - 1);
        return res;
      }),
      catchError((error) => {
        console.warn('API rejet partenaire hors ligne, mise à jour locale :', error);
        this.updateLocalStatus(idUsers, 'REJETE', cleanMotif);
        this.setPendingCount(this.pendingCount() - 1);
        return of({
          idUsers,
          nomComplet: 'Partenaire rejeté',
          email: '',
          statutModeration: 'REJETE',
          motifRejet: cleanMotif
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
