import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError, catchError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/utilisateurs`;

  constructor() {
    // Purge de sécurité de l'ancien cache local obsolète
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('maliexplorer_users_custom');
      } catch (e) {
        console.warn('Impossible de nettoyer le cache obsolète des utilisateurs', e);
      }
    }
  }

  private mapRoleFromBackend(role: any): string {
    if (!role) return 'Explorateur';
    const r = String(role).toUpperCase();
    if (r.includes('SUPER') || r.includes('ADMIN')) return 'Administrateur';
    if (r.includes('GUIDE')) return 'Guide Local';
    if (r.includes('EXPLORATEUR') || r.includes('TOURISTE')) return 'Explorateur';
    if (r.includes('PROMOTEUR')) return 'Promoteur';
    if (r.includes('PARTENAIRE')) return 'Partenaire';
    if (r.includes('INVESTISSEUR')) return 'Investisseur';
    return String(role);
  }

  private mapUser(dto: any): User {
    let dateStr = dto.dateInscription;
    if (!dateStr && dto.dateCreation) {
      try {
        const d = new Date(dto.dateCreation);
        if (!isNaN(d.getTime())) {
          dateStr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
        }
      } catch {
        dateStr = '';
      }
    }

    return {
      id: dto.id ?? dto.idUsers,
      nom: dto.nom || '',
      prenom: dto.prenom || '',
      email: dto.email || '',
      telephone: dto.telephone || '',
      adresse: dto.adresse || '',
      role: this.mapRoleFromBackend(dto.role),
      statut: dto.statut || 'ACTIF',
      points: typeof dto.points === 'number' ? dto.points : 0,
      photoUrl: dto.photoUrl || '',
      pieceIdentite: dto.pieceIdentite || '',
      nomOrganisation: dto.nomOrganisation || '',
      adresseOrganisation: dto.adresseOrganisation || '',
      piecesJustificatifs: dto.piecesJustificatifs || '',
      photoPieceOrganisation: dto.photoPieceOrganisation || '',
      nomEvenement: dto.nomEvenement || '',
      dateEvenement: dto.dateEvenement || '',
      descriptionEvenement: dto.descriptionEvenement || '',
      photosEvenement: Array.isArray(dto.photosEvenement) ? dto.photosEvenement : [],
      langues: dto.langues || dto.langue || '',
      experience: typeof dto.experience === 'number' ? dto.experience : undefined,
      description: dto.description || dto.descriptionEvenement || '',
      statutModeration: dto.statutModeration || '',
      dateInscription: dateStr || ''
    };
  }

  getUsers(): Observable<User[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map((dtos) => {
        if (Array.isArray(dtos)) {
          return dtos.map((dto) => this.mapUser(dto));
        }
        return [];
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des utilisateurs depuis le backend :', error);
        return throwError(() => error);
      })
    );
  }

  getUserById(id: number | string): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((dto) => this.mapUser(dto)),
      catchError((error) => {
        console.error(`Erreur lors de la récupération de l'utilisateur ${id} :`, error);
        return throwError(() => error);
      })
    );
  }

  private mapRoleToBackend(role: any): string {
    if (!role) return 'touriste';
    const r = String(role).toLowerCase();
    if (r.includes('super')) return 'superAdmin';
    if (r.includes('admin')) return 'admin';
    if (r.includes('guide')) return 'guide';
    if (r.includes('promoteur')) return 'promoteur';
    if (r.includes('partenaire')) return 'partenaire';
    if (r.includes('investisseur')) return 'investisseur';
    return 'touriste';
  }

  createUser(user: User): Observable<User> {
    const payload = {
      nom: user.nom?.trim() || '',
      prenom: user.prenom?.trim() || user.nom?.trim() || '',
      email: user.email?.trim() || '',
      telephone: user.telephone?.trim() || '',
      adresse: user.adresse?.trim() || '',
      photoUrl: user.photoUrl?.trim() || '',
      pieceIdentite: user.pieceIdentite?.trim() || '',
      nomOrganisation: user.nomOrganisation?.trim() || '',
      role: this.mapRoleToBackend(user.role),
      statut: user.statut || 'ACTIF',
      points: user.points ?? 0,
      langues: user.langues?.trim() || 'Français, Bambara',
      experience: user.experience ?? 1,
      description: user.description?.trim() || '',
      nomEvenement: user.nomEvenement?.trim() || '',
      dateEvenement: user.dateEvenement?.trim() || '',
      descriptionEvenement: user.descriptionEvenement?.trim() || '',
      photosEvenement: user.photosEvenement || []
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((res) => this.mapUser(res)),
      catchError((error) => {
        console.error('Erreur lors de la création de l\'utilisateur sur le backend :', error);
        return throwError(() => error);
      })
    );
  }

  updateUser(id: number | string, user: User): Observable<User> {
    const payload = {
      nom: user.nom?.trim() || '',
      prenom: user.prenom?.trim() || user.nom?.trim() || '',
      email: user.email?.trim() || '',
      telephone: user.telephone?.trim() || '',
      adresse: user.adresse?.trim() || '',
      photoUrl: user.photoUrl?.trim() || '',
      pieceIdentite: user.pieceIdentite?.trim() || '',
      nomOrganisation: user.nomOrganisation?.trim() || '',
      role: this.mapRoleToBackend(user.role),
      statut: user.statut || 'ACTIF',
      points: user.points ?? 0,
      langues: user.langues?.trim() || 'Français, Bambara',
      experience: user.experience ?? 1,
      description: user.description?.trim() || '',
      nomEvenement: user.nomEvenement?.trim() || '',
      dateEvenement: user.dateEvenement?.trim() || '',
      descriptionEvenement: user.descriptionEvenement?.trim() || '',
      photosEvenement: user.photosEvenement || []
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res) => this.mapUser(res)),
      catchError((error) => {
        console.error(`Erreur lors de la mise à jour de l'utilisateur ${id} sur le backend :`, error);
        return throwError(() => error);
      })
    );
  }

  deleteUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la suppression de l'utilisateur ${id} sur le backend :`, error);
        return throwError(() => error);
      })
    );
  }

  toggleBlockUser(id: number | string): Observable<User> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      map((res) => this.mapUser(res)),
      catchError((error) => {
        console.error(`Erreur lors du basculement du statut de l'utilisateur ${id} sur le backend :`, error);
        return throwError(() => error);
      })
    );
  }
}
