import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/utilisateurs`;

  private readonly STORAGE_KEY = 'maliexplorer_users_custom';

  private fallbackUsers: User[] = [
    {
      id: 1,
      nom: 'Traoré',
      prenom: 'Amadou',
      email: 'amadou.traore@maliexplorer.ml',
      role: 'Administrateur',
      statut: 'ACTIF',
      points: 850,
      dateInscription: '12 janv. 2026'
    },
    {
      id: 2,
      nom: 'Coulibaly',
      prenom: 'Fatoumata',
      email: 'fatou.coulibaly@gmail.com',
      role: 'Explorateur',
      statut: 'ACTIF',
      points: 1240,
      dateInscription: '18 févr. 2026'
    },
    {
      id: 3,
      nom: 'Diallo',
      prenom: 'Oumar',
      email: 'oumar.diallo@yahoo.fr',
      role: 'Guide Local',
      statut: 'ACTIF',
      points: 620,
      dateInscription: '05 mars 2026'
    },
    {
      id: 4,
      nom: 'Cissé',
      prenom: 'Aïssata',
      email: 'aissata.cisse@orange.ml',
      role: 'Explorateur',
      statut: 'EN_ATTENTE',
      points: 150,
      dateInscription: '29 mars 2026'
    },
    {
      id: 5,
      nom: 'Keïta',
      prenom: 'Bakary',
      email: 'bakary.keita@gmail.com',
      role: 'Promoteur',
      statut: 'ACTIF',
      points: 980,
      dateInscription: '10 avr. 2026'
    }
  ];

  private getLocalUsers(): User[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage utilisateurs', e);
    }
    return [...this.fallbackUsers];
  }

  private saveLocalUsers(users: User[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Erreur écriture localStorage utilisateurs', e);
    }
  }

  private mapRoleFromBackend(role: any): string {
    if (!role) return 'Visiteur';
    const r = String(role).toUpperCase();
    if (r.includes('ADMIN')) return 'Administrateur';
    if (r.includes('GUIDE')) return 'Guide Local';
    if (r.includes('EXPLORATEUR') || r.includes('TOURISTE')) return 'Explorateur';
    if (r.includes('PROMOTEUR')) return 'Promoteur';
    if (r.includes('ARTISAN')) return 'Artisan';
    if (r.includes('PARTENAIRE')) return 'Partenaire';
    return 'Visiteur';
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
        dateStr = 'Récemment inscrit';
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
      photoUrl: dto.photoUrl,
      pieceIdentite: dto.pieceIdentite,
      nomOrganisation: dto.nomOrganisation,
      adresseOrganisation: dto.adresseOrganisation,
      piecesJustificatifs: dto.piecesJustificatifs,
      photoPieceOrganisation: dto.photoPieceOrganisation,
      nomEvenement: dto.nomEvenement,
      dateEvenement: dto.dateEvenement,
      descriptionEvenement: dto.descriptionEvenement,
      photosEvenement: dto.photosEvenement,
      langues: dto.langues || dto.langue,
      experience: dto.experience,
      dateInscription: dateStr || 'Récemment inscrit'
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
        console.warn('API Spring Boot non disponible pour les utilisateurs, utilisation du stockage local :', error);
        return of(this.getLocalUsers());
      })
    );
  }

  getUserById(id: number | string): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalUsers();
        const found = local.find((u) => String(u.id) === String(id));
        return of(found ? this.mapUser(found) : { id, nom: 'Utilisateur', email: 'user@example.com' });
      })
    );
  }

  private mapRoleToBackend(role: any): string {
    if (!role) return 'touriste';
    const r = String(role).toLowerCase();
    if (r.includes('super')) return 'superAdmin';
    if (r.includes('admin')) return 'admin';
    if (r.includes('guide')) return 'guide';
    if (r.includes('artisan')) return 'artisan';
    if (r.includes('promoteur')) return 'promoteur';
    if (r.includes('partenaire')) return 'partenaire';
    if (r.includes('investisseur')) return 'investisseur';
    return 'touriste';
  }

  createUser(user: User): Observable<User> {
    const todayStr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
    const payload = {
      nom: user.nom?.trim() || '',
      prenom: user.prenom?.trim() || user.nom?.trim() || 'Utilisateur',
      email: user.email?.trim() || '',
      telephone: user.telephone?.trim() || '',
      adresse: user.adresse?.trim() || '',
      photoUrl: user.photoUrl?.trim() || '',
      pieceIdentite: user.pieceIdentite?.trim() || '',
      nomOrganisation: user.nomOrganisation?.trim() || '',
      role: this.mapRoleToBackend(user.role),
      points: user.points ?? 0
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local utilisateur :', error);
        const newUser: User = {
          ...user,
          id: Date.now(),
          dateInscription: todayStr
        };
        const current = this.getLocalUsers();
        current.unshift(newUser);
        this.saveLocalUsers(current);
        return of(newUser);
      })
    );
  }

  updateUser(id: number | string, user: User): Observable<User> {
    const payload = {
      nom: user.nom?.trim() || '',
      prenom: user.prenom?.trim() || user.nom?.trim() || 'Utilisateur',
      email: user.email?.trim() || '',
      telephone: user.telephone?.trim() || '',
      adresse: user.adresse?.trim() || '',
      photoUrl: user.photoUrl?.trim() || '',
      pieceIdentite: user.pieceIdentite?.trim() || '',
      nomOrganisation: user.nomOrganisation?.trim() || '',
      role: this.mapRoleToBackend(user.role),
      points: user.points ?? 0
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale utilisateur :', error);
        const current = this.getLocalUsers();
        const index = current.findIndex((u) => String(u.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...user, id };
          this.saveLocalUsers(current);
        }
        return of({ ...user, id });
      })
    );
  }

  deleteUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale utilisateur :', error);
        const current = this.getLocalUsers().filter((u) => String(u.id) !== String(id));
        this.saveLocalUsers(current);
        return of(void 0);
      })
    );
  }

  toggleBlockUser(id: number | string): Observable<User> {
    const current = this.getLocalUsers();
    const found = current.find((u) => String(u.id) === String(id));
    if (found) {
      found.statut = found.statut === 'ACTIF' ? 'BLOQUE' : 'ACTIF';
      this.saveLocalUsers(current);
    }
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      catchError(() => of(found!))
    );
  }
}
