import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, catchError, map } from 'rxjs';
import {
  LieuHistorique,
  LieuHistoriqueRequestDTO,
  LieuHistoriqueResponseDTO
} from '../models/lieu-historique.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LieuHistoriqueService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/lieux-historiques`;

  /**
   * Convertit un DTO de réponse Spring Boot vers le modèle UI LieuHistorique
   */
  mapResponseToLieu(dto: LieuHistoriqueResponseDTO): LieuHistorique {
    return {
      id: dto.idLieu,
      idLieu: dto.idLieu,
      nom: dto.nomLieuHisto,
      nomLieuHisto: dto.nomLieuHisto,
      epoque: dto.epoque || '',
      ville: dto.ville?.nom || '',
      villeId: dto.ville?.id,
      region: 'Mali',
      coordonneesGps: dto.cordonnees || (dto.latitude && dto.longitude ? `${dto.latitude}, ${dto.longitude}` : ''),
      cordonnees: dto.cordonnees,
      latitude: dto.latitude,
      longitude: dto.longitude,
      panorama360Url: dto.panorama360Url,
      description: dto.description || '',
      classeUnesco: false
    };
  }

  /**
   * Convertit le modèle UI LieuHistorique vers le DTO de requête Spring Boot
   */
  mapLieuToRequestDTO(lieu: LieuHistorique): LieuHistoriqueRequestDTO {
    let lat = lieu.latitude;
    let lng = lieu.longitude;
    const gps = (lieu.cordonnees || lieu.coordonneesGps || '').trim();

    // Extraction automatique si des coordonnées numériques sont saisies au format "lat, lng"
    if ((lat === undefined || lng === undefined) && gps.includes(',')) {
      const parts = gps.split(',');
      const parsedLat = parseFloat(parts[0].replace(/[^\d.-]/g, ''));
      const parsedLng = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
      if (!isNaN(parsedLat)) lat = parsedLat;
      if (!isNaN(parsedLng)) lng = parsedLng;
    }

    const payload: LieuHistoriqueRequestDTO = {
      nomLieuHisto: (lieu.nomLieuHisto || lieu.nom || '').trim(),
      description: lieu.description || '',
      epoque: lieu.epoque || '',
      cordonnees: gps,
      latitude: lat,
      longitude: lng,
      panorama360Url: lieu.panorama360Url || ''
    };

    // On ne transmet villeId que s'il est numérique et valide
    if (lieu.villeId && Number(lieu.villeId) > 0) {
      payload.villeId = Number(lieu.villeId);
    }

    return payload;
  }

  /**
   * Récupère la liste réelle des lieux historiques depuis MySQL via Spring Boot
   */
  getLieuxHistoriques(): Observable<LieuHistorique[]> {
    return this.http.get<LieuHistoriqueResponseDTO[]>(this.apiUrl).pipe(
      map((dtos) => {
        if (Array.isArray(dtos)) {
          return dtos.map((dto) => this.mapResponseToLieu(dto));
        }
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur API Spring Boot GET /api/lieux-historiques :', error);
        return of([]);
      })
    );
  }

  getLieuHistoriqueById(id: number | string): Observable<LieuHistorique> {
    return this.http.get<LieuHistoriqueResponseDTO>(`${this.apiUrl}/${id}`).pipe(
      map((dto) => this.mapResponseToLieu(dto))
    );
  }

  /**
   * Crée un nouveau lieu historique en base de données MySQL
   */
  createLieuHistorique(lieu: LieuHistorique): Observable<LieuHistorique> {
    const requestDTO = this.mapLieuToRequestDTO(lieu);
    console.log('Envoi requête POST /api/lieux-historiques :', requestDTO);

    return this.http.post<LieuHistoriqueResponseDTO>(this.apiUrl, requestDTO).pipe(
      map((responseDTO) => {
        console.log('Réponse reçue de Spring Boot pour createLieu :', responseDTO);
        const created = this.mapResponseToLieu(responseDTO);
        created.images = lieu.images;
        return created;
      })
      // Ne masque pas les erreurs serveur pour que l'utilisateur soit informé
    );
  }

  /**
   * Modifie un lieu historique dans MySQL
   */
  updateLieuHistorique(id: number | string, lieu: LieuHistorique): Observable<LieuHistorique> {
    const requestDTO = this.mapLieuToRequestDTO(lieu);
    return this.http.put<LieuHistoriqueResponseDTO>(`${this.apiUrl}/${id}`, requestDTO).pipe(
      map((responseDTO) => {
        const updated = this.mapResponseToLieu(responseDTO);
        updated.images = lieu.images;
        return updated;
      })
    );
  }

  /**
   * Supprime un lieu historique de MySQL
   */
  deleteLieuHistorique(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Méthodes alias pour la compatibilité avec les composants
  getLieux(): Observable<LieuHistorique[]> {
    return this.getLieuxHistoriques();
  }

  getLieuById(id: number | string): Observable<LieuHistorique> {
    return this.getLieuHistoriqueById(id);
  }

  createLieu(lieu: LieuHistorique): Observable<LieuHistorique> {
    return this.createLieuHistorique(lieu);
  }

  updateLieu(id: number | string, lieu: LieuHistorique): Observable<LieuHistorique> {
    return this.updateLieuHistorique(id, lieu);
  }

  deleteLieu(id: number | string): Observable<void> {
    return this.deleteLieuHistorique(id);
  }
}
