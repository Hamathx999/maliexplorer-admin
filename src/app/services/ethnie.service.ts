import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Ethnie } from '../models/ethnie.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EthnieService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ethnies`;

  private fallbackEthnies: Ethnie[] = [
    {
      id: 1,
      nom: 'Bambara (Bamana)',
      langues: 'Bambara (Bamanankan)',
      region: 'Ségou, Koulikoro, Bamako',
      populationEstimee: '33% de la population',
      description: 'Le groupe ethnique le plus important du Mali, réputé pour son riche patrimoine agraire, les masques Ciwara et la tradition orale des griots.'
    },
    {
      id: 2,
      nom: 'Peul (Fulani / Fula)',
      langues: 'Peul (Fulfulde)',
      region: 'Mopti, Ségou, Gao',
      populationEstimee: '14% de la population',
      description: 'Peuple pasteur emblématique du delta central du Niger, réputé pour son élevage, sa poésie pastorale et ses parures d’or et d’ambre.'
    },
    {
      id: 3,
      nom: 'Dogon',
      langues: 'Langues dogon (Toro So, Tommo So)',
      region: 'Bandiagara, Mopti',
      populationEstimee: '9% de la population',
      description: 'Célèbres pour leur cosmogonie complexe, leurs falaises classées au patrimoine de l’UNESCO, leurs danses de masques et leur architecture de pierre et banco.'
    },
    {
      id: 4,
      nom: 'Songhaï',
      langues: 'Songhaï (Koyraboro Senni)',
      region: 'Gao, Tombouctou',
      populationEstimee: '7% de la population',
      description: 'Héritiers du grand Empire Songhaï, peuple commerçant et lettré riverain du fleuve Niger aux manuscrits séculaires.'
    },
    {
      id: 5,
      nom: 'Soninké (Sarakolé)',
      langues: 'Soninké',
      region: 'Kayes, Nara, Koulikoro',
      populationEstimee: '8% de la population',
      description: 'Fondateurs du légendaire Empire du Ghana (Wagadou), reconnus pour leur maîtrise historique du commerce transsaharien.'
    },
    {
      id: 6,
      nom: 'Malinké (Maninka)',
      langues: 'Malinké (Maninkakan)',
      region: 'Koulikoro, Kita, Kayes',
      populationEstimee: '6% de la population',
      description: 'Bâtisseurs de l’Empire du Mali avec Soundiata Keïta, détenteurs de la Charte de Kouroukan Fouga (patrimoine mondial immatériel).'
    },
    {
      id: 7,
      nom: 'Touareg (Kel Tamasheq)',
      langues: 'Tamasheq',
      region: 'Kidal, Ménaka, Tombouctou, Gao',
      populationEstimee: '3% de la population',
      description: 'Peuple nomade du Sahara, maîtres de l’artisanat du cuir et de l’argent, vêtus du tagelmust bleu indigo.'
    },
    {
      id: 8,
      nom: 'Sénoufo',
      langues: 'Sénoufo (Senari)',
      region: 'Sikasso',
      populationEstimee: '9% de la population',
      description: 'Artisans du bois, sculpteurs de masques et virtuoses du balafon, vivant dans le sud verdoyant du Mali.'
    },
    {
      id: 9,
      nom: 'Bozo',
      langues: 'Bozo',
      region: 'Mopti, Ségou',
      populationEstimee: '2% de la population',
      description: 'Les « maîtres de l’eau », pêcheurs et navigateurs ancestraux du fleuve Niger.'
    }
  ];

  getEthnies(): Observable<Ethnie[]> {
    return this.http.get<Ethnie[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les ethnies, utilisation du cache local :', error);
        return of(this.fallbackEthnies);
      })
    );
  }

  getEthnieById(id: number | string): Observable<Ethnie> {
    return this.http.get<Ethnie>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackEthnies.find((e) => e.id === id);
        return of(found ?? { id, nom: 'Ethnie inconnue', langues: 'Français' });
      })
    );
  }

  createEthnie(ethnie: Ethnie): Observable<Ethnie> {
    return this.http.post<Ethnie>(this.apiUrl, ethnie).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de l’ethnie :', error);
        const newEthnie: Ethnie = {
          ...ethnie,
          id: Date.now()
        };
        this.fallbackEthnies.unshift(newEthnie);
        return of(newEthnie);
      })
    );
  }

  updateEthnie(id: number | string, ethnie: Ethnie): Observable<Ethnie> {
    return this.http.put<Ethnie>(`${this.apiUrl}/${id}`, ethnie).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de l’ethnie :', error);
        const index = this.fallbackEthnies.findIndex((e) => e.id === id);
        if (index !== -1) {
          this.fallbackEthnies[index] = { ...this.fallbackEthnies[index], ...ethnie, id };
        }
        return of({ ...ethnie, id });
      })
    );
  }

  deleteEthnie(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de l’ethnie :', error);
        this.fallbackEthnies = this.fallbackEthnies.filter((e) => e.id !== id);
        return of(void 0);
      })
    );
  }
}
