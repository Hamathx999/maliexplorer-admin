import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, switchMap } from 'rxjs';
import { Administrateur } from '../models/administrateur.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdministrateurService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/administrateurs`;
  private readonly usersUrl = `${environment.apiUrl}/utilisateurs`;
  private readonly STORAGE_KEY = 'maliexplorer_real_admins_cache';

  private getCachedAdmins(): Administrateur[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture cache local des administrateurs:', e);
    }
    return [];
  }

  private saveToCache(admins: Administrateur[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(admins));
    } catch (e) {
      console.warn('Erreur sauvegarde cache local administrateurs:', e);
    }
  }

  private mapUserToAdmin(user: any): Administrateur {
    const rawRole = String(user.role || '').toLowerCase();
    const role: 'admin' | 'superAdmin' = rawRole.includes('super') ? 'superAdmin' : 'admin';
    
    let dateStr = user.dateCreation;
    if (!dateStr && user.dateInscription) dateStr = user.dateInscription;
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch {
        // Conserver dateStr tel quel
      }
    }

    return {
      idUsers: user.idUsers ?? user.id,
      firebaseUid: user.firebaseUid,
      prenom: user.prenom || '',
      nom: user.nom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      adresse: user.adresse || '',
      photoUrl: user.photoUrl || '',
      role: role,
      statut: user.statut || 'ACTIF',
      dateCreation: dateStr || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Récupère dynamiquement les VRAIS administrateurs et super administrateurs depuis le backend.
   * Interroge /api/administrateurs et complète avec /api/utilisateurs pour garantir que tous les comptes réels
   * (y compris les comptes enregistrés via Firebase Auth) soient récupérés en temps réel.
   */
  getAll(): Observable<Administrateur[]> {
    return this.http.get<Administrateur[]>(this.apiUrl).pipe(
      switchMap((adminList) => {
        // Interroge également la liste globale des utilisateurs pour capturer tout compte administrateur réel
        return this.http.get<any[]>(this.usersUrl).pipe(
          map((users) => {
            const map = new Map<string, Administrateur>();

            // 1. Ajouter les administrateurs renvoyés par /api/administrateurs
            if (Array.isArray(adminList)) {
              for (const a of adminList) {
                if (a.email) {
                  map.set(a.email.toLowerCase(), a);
                }
              }
            }

            // 2. Filtrer et ajouter les administrateurs réels de la table utilisateurs
            if (Array.isArray(users)) {
              for (const u of users) {
                const r = String(u.role || '').toLowerCase();
                if (r.includes('admin') || r.includes('super')) {
                  const mapped = this.mapUserToAdmin(u);
                  if (mapped.email && !map.has(mapped.email.toLowerCase())) {
                    map.set(mapped.email.toLowerCase(), mapped);
                  }
                }
              }
            }

            const finalList = Array.from(map.values());
            if (finalList.length > 0) {
              this.saveToCache(finalList);
            }
            return finalList;
          }),
          catchError(() => {
            if (Array.isArray(adminList) && adminList.length > 0) {
              this.saveToCache(adminList);
              return of(adminList);
            }
            return of(this.getCachedAdmins());
          })
        );
      }),
      catchError((err) => {
        console.warn('API /api/administrateurs inaccessible, tentative via /api/utilisateurs...', err);
        return this.http.get<any[]>(this.usersUrl).pipe(
          map((users) => {
            const adminUsers = (users || [])
              .filter((u) => {
                const r = String(u.role || '').toLowerCase();
                return r.includes('admin') || r.includes('super');
              })
              .map((u) => this.mapUserToAdmin(u));

            if (adminUsers.length > 0) {
              this.saveToCache(adminUsers);
            }
            return adminUsers;
          }),
          catchError(() => of(this.getCachedAdmins()))
        );
      })
    );
  }

  getById(id: number): Observable<Administrateur> {
    return this.http.get<Administrateur>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const cached = this.getCachedAdmins().find((a) => a.idUsers === id);
        if (cached) return of(cached);
        return this.http.get<any>(`${this.usersUrl}/${id}`).pipe(
          map((u) => this.mapUserToAdmin(u))
        );
      })
    );
  }

  create(admin: Partial<Administrateur>): Observable<Administrateur> {
    const payload = {
      prenom: admin.prenom?.trim(),
      nom: admin.nom?.trim(),
      email: admin.email?.trim(),
      telephone: admin.telephone?.trim() || '',
      adresse: admin.adresse?.trim() || '',
      photoUrl: admin.photoUrl?.trim() || '',
      role: admin.role === 'superAdmin' ? 'superAdmin' : 'admin',
      statut: admin.statut || 'ACTIF',
      motDePasse: admin.motDePasse
    };

    return this.http.post<Administrateur>(this.apiUrl, payload).pipe(
      map((res) => {
        const cached = this.getCachedAdmins();
        cached.unshift(res);
        this.saveToCache(cached);
        return res;
      }),
      catchError((err) => {
        console.warn('Fallback création via /api/utilisateurs...', err);
        return this.http.post<any>(this.usersUrl, payload).pipe(
          map((u) => {
            const mapped = this.mapUserToAdmin(u);
            const cached = this.getCachedAdmins();
            cached.unshift(mapped);
            this.saveToCache(cached);
            return mapped;
          })
        );
      })
    );
  }

  update(id: number, admin: Partial<Administrateur>): Observable<Administrateur> {
    const payload = {
      prenom: admin.prenom?.trim(),
      nom: admin.nom?.trim(),
      email: admin.email?.trim(),
      telephone: admin.telephone?.trim() || '',
      adresse: admin.adresse?.trim() || '',
      photoUrl: admin.photoUrl?.trim() || '',
      role: admin.role === 'superAdmin' ? 'superAdmin' : 'admin',
      statut: admin.statut || 'ACTIF'
    };

    return this.http.put<Administrateur>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res) => {
        const cached = this.getCachedAdmins();
        const idx = cached.findIndex((a) => a.idUsers === id);
        if (idx !== -1) {
          cached[idx] = res;
          this.saveToCache(cached);
        }
        return res;
      }),
      catchError((err) => {
        console.warn('Fallback mise à jour via /api/utilisateurs...', err);
        return this.http.put<any>(`${this.usersUrl}/${id}`, payload).pipe(
          map((u) => {
            const mapped = this.mapUserToAdmin(u);
            const cached = this.getCachedAdmins();
            const idx = cached.findIndex((a) => a.idUsers === id);
            if (idx !== -1) {
              cached[idx] = mapped;
              this.saveToCache(cached);
            }
            return mapped;
          })
        );
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        const cached = this.getCachedAdmins().filter((a) => a.idUsers !== id);
        this.saveToCache(cached);
        return void 0;
      }),
      catchError(() => {
        return this.http.delete<void>(`${this.usersUrl}/${id}`).pipe(
          map(() => {
            const cached = this.getCachedAdmins().filter((a) => a.idUsers !== id);
            this.saveToCache(cached);
            return void 0;
          })
        );
      })
    );
  }

  toggleBlock(admin: Administrateur): Observable<Administrateur> {
    const newStatus = admin.statut === 'ACTIF' ? 'BLOQUE' : 'ACTIF';
    return this.update(admin.idUsers!, { ...admin, statut: newStatus });
  }
}
