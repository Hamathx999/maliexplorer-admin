import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { GuideRequestDTO, GuideResponseDTO } from '../models/guide.model';

@Injectable({
  providedIn: 'root'
})
export class GuideService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/guides`;
  private readonly moderationUrl = `${environment.apiUrl}/admin/moderation/opportunites`;

  getGuides(): Observable<GuideResponseDTO[]> {
    return this.http.get<GuideResponseDTO[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération des guides :', error);
        return of([]);
      })
    );
  }

  getGuideById(id: number | string): Observable<GuideResponseDTO> {
    return this.http.get<GuideResponseDTO>(`${this.apiUrl}/${id}`);
  }

  rechercherParLangue(langue: string): Observable<GuideResponseDTO[]> {
    return this.http.get<GuideResponseDTO[]>(`${this.apiUrl}/langue/${encodeURIComponent(langue)}`).pipe(
      catchError((error) => {
        console.error(`Erreur recherche guides par langue ${langue} :`, error);
        return of([]);
      })
    );
  }

  createGuide(guide: GuideRequestDTO): Observable<GuideResponseDTO> {
    return this.http.post<GuideResponseDTO>(this.apiUrl, guide);
  }

  updateGuide(id: number | string, guide: GuideRequestDTO): Observable<GuideResponseDTO> {
    return this.http.put<GuideResponseDTO>(`${this.apiUrl}/${id}`, guide);
  }

  deleteGuide(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  validerGuide(idUsers: number | string): Observable<any> {
    return this.http.patch<any>(`${this.moderationUrl}/${idUsers}/valider`, {});
  }

  rejeterGuide(idUsers: number | string, motif?: string): Observable<any> {
    let params = new HttpParams();
    if (motif) {
      params = params.set('motif', motif);
    }
    return this.http.patch<any>(`${this.moderationUrl}/${idUsers}/rejeter`, {}, { params });
  }
}
