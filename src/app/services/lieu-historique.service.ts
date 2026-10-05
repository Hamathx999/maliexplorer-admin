import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { LieuHistorique } from '../models/lieu-historique.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LieuHistoriqueService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/lieux-historiques`;

  private fallbackLieux: LieuHistorique[] = [
    {
      id: 1,
      nom: 'La Grande Mosquée de Djenné',
      epoque: 'XIIIe siècle (rebâtie en 1907)',
      ville: 'Djenné',
      region: 'Mopti',
      coordonneesGps: '13.9056° N, 4.5556° W',
      description: 'Le plus grand édifice en terre crue (banco) au monde, symbole absolu de l’architecture soudano-sahélienne, classé au patrimoine mondial de l’UNESCO.',
      classeUnesco: true,
      images: [
        { nom: 'Vue majestueuse de la mosquée de Djenné sous le soleil couchant', taille: '4.2 Mo' },
        { nom: 'Détails de l\'architecture en banco et piliers de bois', taille: '3.8 Mo' }
      ]
    },
    {
      id: 2,
      nom: 'Mosquée Djingareyber de Tombouctou',
      epoque: '1327 (règne de Kankou Moussa)',
      ville: 'Tombouctou',
      region: 'Tombouctou',
      coordonneesGps: '16.7731° N, 3.0075° W',
      description: 'Conçue par l’architecte andalou Abou Ishaq es-Sahéli à la demande de l’empereur Kankou Moussa de retour de son célèbre pèlerinage.',
      classeUnesco: true
    },
    {
      id: 3,
      nom: 'Tombeau des Askia',
      epoque: '1495',
      ville: 'Gao',
      region: 'Gao',
      coordonneesGps: '16.2975° N, 0.0458° E',
      description: 'Structure pyramidale spectaculaire de 17 mètres de hauteur édifiée par Askia Mohamed, empereur de l’Empire Songhaï.',
      classeUnesco: true
    },
    {
      id: 4,
      nom: 'Falaises de Bandiagara (Pays Dogon)',
      epoque: 'Dès le XVe siècle',
      ville: 'Bandiagara',
      region: 'Bandiagara / Mopti',
      coordonneesGps: '14.3333° N, 3.6000° W',
      description: 'Chaîne de grès s’étendant sur plus de 150 km, abritant des villages suspendus, des greniers taillés dans la roche et les sanctuaires Tellem.',
      classeUnesco: true
    },
    {
      id: 5,
      nom: 'Tata de Sikasso',
      epoque: '1890 (Tiéba Traoré)',
      ville: 'Sikasso',
      region: 'Sikasso',
      coordonneesGps: '11.3167° N, 5.6667° W',
      description: 'Muraille défensive fortifiée légendaire de 9 kilomètres de périmètre ayant résisté au siège du conquérant Samory Touré.',
      classeUnesco: false
    },
    {
      id: 6,
      nom: 'Fort de Médine',
      epoque: '1855',
      ville: 'Médine',
      region: 'Kayes',
      coordonneesGps: '14.3753° N, 11.3653° W',
      description: 'Fortification historique en bordure du fleuve Sénégal, théâtre du célèbre siège de 1857 mené par El Hadj Oumar Tall.',
      classeUnesco: false
    }
  ];

  getLieuxHistoriques(): Observable<LieuHistorique[]> {
    return this.http.get<LieuHistorique[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les lieux historiques, utilisation du cache local :', error);
        return of(this.fallbackLieux);
      })
    );
  }

  getLieuHistoriqueById(id: number | string): Observable<LieuHistorique> {
    return this.http.get<LieuHistorique>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackLieux.find((l) => l.id === id);
        return of(found ?? { id, nom: 'Lieu historique', epoque: '', ville: '', region: '' });
      })
    );
  }

  createLieuHistorique(lieu: LieuHistorique): Observable<LieuHistorique> {
    return this.http.post<LieuHistorique>(this.apiUrl, lieu).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local lieu historique :', error);
        const newLieu: LieuHistorique = {
          ...lieu,
          id: Date.now()
        };
        this.fallbackLieux.unshift(newLieu);
        return of(newLieu);
      })
    );
  }

  updateLieuHistorique(id: number | string, lieu: LieuHistorique): Observable<LieuHistorique> {
    return this.http.put<LieuHistorique>(`${this.apiUrl}/${id}`, lieu).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale lieu historique :', error);
        const index = this.fallbackLieux.findIndex((l) => l.id === id);
        if (index !== -1) {
          this.fallbackLieux[index] = { ...this.fallbackLieux[index], ...lieu, id };
        }
        return of({ ...lieu, id });
      })
    );
  }

  deleteLieuHistorique(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale lieu historique :', error);
        this.fallbackLieux = this.fallbackLieux.filter((l) => l.id !== id);
        return of(void 0);
      })
    );
  }

  // Méthodes alias pour la compatibilité
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
