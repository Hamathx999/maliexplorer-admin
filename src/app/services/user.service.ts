import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/utilisateurs`;

  private fallbackUsers: User[] = [
    {
      id: 1,
      nom: 'Traoré',
      prenom: 'Amadou',
      email: 'amadou.traore@maliexplorer.ml',
      role: 'Administrateur',
      statut: 'ACTIF',
      points: 850,
      dateInscription: '12/01/2026'
    },
    {
      id: 2,
      nom: 'Coulibaly',
      prenom: 'Fatoumata',
      email: 'fatou.coulibaly@gmail.com',
      role: 'Explorateur',
      statut: 'ACTIF',
      points: 1240,
      dateInscription: '18/02/2026'
    },
    {
      id: 3,
      nom: 'Diallo',
      prenom: 'Oumar',
      email: 'oumar.diallo@yahoo.fr',
      role: 'Guide Local',
      statut: 'ACTIF',
      points: 620,
      dateInscription: '05/03/2026'
    },
    {
      id: 4,
      nom: 'Cissé',
      prenom: 'Aïssata',
      email: 'aissata.cisse@orange.ml',
      role: 'Explorateur',
      statut: 'EN_ATTENTE',
      points: 150,
      dateInscription: '29/03/2026'
    },
    {
      id: 5,
      nom: 'Keïta',
      prenom: 'Bakary',
      email: 'bakary.keita@gmail.com',
      role: 'Promoteur',
      statut: 'ACTIF',
      points: 980,
      dateInscription: '10/04/2026'
    }
  ];

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les utilisateurs, utilisation du cache local :', error);
        return of(this.fallbackUsers);
      })
    );
  }

  getUserById(id: number | string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackUsers.find((u) => u.id === id);
        return of(found ?? { id, nom: 'Utilisateur', email: 'user@example.com' });
      })
    );
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local utilisateur :', error);
        const newUser: User = {
          ...user,
          id: Date.now(),
          dateInscription: new Date().toLocaleDateString('fr-FR')
        };
        this.fallbackUsers.unshift(newUser);
        return of(newUser);
      })
    );
  }

  updateUser(id: number | string, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale utilisateur :', error);
        const index = this.fallbackUsers.findIndex((u) => u.id === id);
        if (index !== -1) {
          this.fallbackUsers[index] = { ...this.fallbackUsers[index], ...user, id };
        }
        return of({ ...user, id });
      })
    );
  }

  deleteUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale utilisateur :', error);
        this.fallbackUsers = this.fallbackUsers.filter((u) => u.id !== id);
        return of(void 0);
      })
    );
  }

  toggleBlockUser(id: number | string): Observable<User> {
    const found = this.fallbackUsers.find((u) => u.id === id);
    if (found) {
      found.statut = found.statut === 'ACTIF' ? 'BLOQUE' : 'ACTIF';
    }
    return this.http.patch<User>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      catchError(() => of(found!))
    );
  }
}
