import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { President } from '../models/president.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PresidentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/presidents`;

  private readonly STORAGE_KEY = 'maliexplorer_presidents_custom';

  private fallbackPresidents: President[] = [
    {
      id: 1,
      nom: 'Keïta',
      prenom: 'Modibo',
      periode: '1960 - 1968',
      periodeMandat: '1960 - 1968',
      titre: 'Père de l\'Indépendance',
      biographie: 'Premier président de la République du Mali après l’indépendance en 1960, panafricaniste convaincu et artisan du non-alignement.'
    },
    {
      id: 2,
      nom: 'Traoré',
      prenom: 'Moussa',
      periode: '1968 - 1991',
      periodeMandat: '1968 - 1991',
      titre: 'Général d\'Armée',
      biographie: 'Président du Comité Militaire de Libération Nationale puis de la Deuxième République du Mali pendant plus de deux décennies.'
    },
    {
      id: 3,
      nom: 'Touré (ATT)',
      prenom: 'Amadou Toumani',
      periode: '1991 - 1992 & 2002 - 2012',
      periodeMandat: '1991 - 1992 & 2002 - 2012',
      titre: 'Le Soldat de la Démocratie',
      biographie: 'Président du CTSP en 1991 initiant la transition démocratique, puis élu 3e président en 2002, célèbre pour ses grands chantiers d\'infrastructures.'
    },
    {
      id: 4,
      nom: 'Konaré',
      prenom: 'Alpha Oumar',
      periode: '1992 - 2002',
      periodeMandat: '1992 - 2002',
      titre: 'Premier Président Démocratiquement Élu',
      biographie: 'Historien et archéologue, premier président de l’ère démocratique malienne (3e République), ayant accompli deux mandats constitutionnels.'
    },
    {
      id: 5,
      nom: 'Traoré',
      prenom: 'Dioncounda',
      periode: '2012 - 2013',
      periodeMandat: '2012 - 2013',
      titre: 'Président de la Transition',
      biographie: 'Professeur d\'université et président de l’Assemblée Nationale, ayant dirigé la transition politique de 2012 à 2013.'
    },
    {
      id: 6,
      nom: 'Keïta (IBK)',
      prenom: 'Ibrahim Boubacar',
      periode: '2013 - 2020',
      periodeMandat: '2013 - 2020',
      titre: 'Président de la République',
      biographie: 'Ancien Premier ministre et président de l’Assemblée Nationale, élu à la magistrature suprême en 2013 et réélu en 2018.'
    },
    {
      id: 7,
      nom: 'Goïta',
      prenom: 'Assimi',
      periode: '2021 - Présent',
      periodeMandat: '2021 - Présent',
      titre: 'Général d\'Armée & Chef de l\'État',
      biographie: 'Président de la Transition, Chef de l\'État du Mali, engagé pour la refondation républicaine et la souveraineté nationale.'
    }
  ];

  private getLocalPresidents(): President[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage presidents', e);
    }
    return [...this.fallbackPresidents];
  }

  private saveLocalPresidents(presidents: President[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presidents));
    } catch (e) {
      console.warn('Erreur écriture localStorage presidents', e);
    }
  }

  getPresidents(): Observable<President[]> {
    return this.http.get<President[]>(this.apiUrl).pipe(
      map((data: President[]) =>
        data.map((p) => ({
          ...p,
          periode: p.periodeMandat || p.periode || '',
          periodeMandat: p.periodeMandat || p.periode || ''
        }))
      ),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les présidents, utilisation du stockage local :', error);
        return of(this.getLocalPresidents());
      })
    );
  }

  getPresidentById(id: number | string): Observable<President> {
    return this.http.get<President>(`${this.apiUrl}/${id}`).pipe(
      map((p: President) => ({
        ...p,
        periode: p.periodeMandat || p.periode || '',
        periodeMandat: p.periodeMandat || p.periode || ''
      })),
      catchError(() => {
        const local = this.getLocalPresidents();
        const found = local.find((p) => String(p.id) === String(id));
        return of(found ?? { id, nom: 'Chef d\'État', periode: '', prenom: '' });
      })
    );
  }

  createPresident(president: President): Observable<President> {
    const payload: President = {
      ...president,
      periodeMandat: president.periodeMandat || president.periode,
      periode: president.periodeMandat || president.periode
    };
    return this.http.post<President>(this.apiUrl, payload).pipe(
      map((created: President) => ({
        ...created,
        periode: created.periodeMandat || created.periode || '',
        periodeMandat: created.periodeMandat || created.periode || ''
      })),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du président :', error);
        const newPres: President = {
          ...payload,
          id: Date.now()
        };
        const current = this.getLocalPresidents();
        current.unshift(newPres);
        this.saveLocalPresidents(current);
        return of(newPres);
      })
    );
  }

  updatePresident(id: number | string, president: President): Observable<President> {
    const payload: President = {
      ...president,
      periodeMandat: president.periodeMandat || president.periode,
      periode: president.periodeMandat || president.periode
    };
    return this.http.put<President>(`${this.apiUrl}/${id}`, payload).pipe(
      map((updated: President) => ({
        ...updated,
        periode: updated.periodeMandat || updated.periode || '',
        periodeMandat: updated.periodeMandat || updated.periode || ''
      })),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du président :', error);
        const current = this.getLocalPresidents();
        const index = current.findIndex((p) => String(p.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...payload, id };
          this.saveLocalPresidents(current);
        }
        return of({ ...payload, id });
      })
    );
  }

  deletePresident(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du président :', error);
        const current = this.getLocalPresidents().filter((p) => String(p.id) !== String(id));
        this.saveLocalPresidents(current);
        return of(void 0);
      })
    );
  }
}
