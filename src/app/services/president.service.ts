import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { President } from '../models/president.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PresidentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/presidents`;

  private fallbackPresidents: President[] = [
    {
      id: 1,
      nom: 'Modibo Keïta',
      periode: '1960 - 1968',
      titre: 'Père de l\'Indépendance',
      biographie: 'Premier président de la République du Mali après l’indépendance en 1960, panafricaniste convaincu et artisan du non-alignement.'
    },
    {
      id: 2,
      nom: 'Moussa Traoré',
      periode: '1968 - 1991',
      titre: 'Général d\'Armée',
      biographie: 'Président du Comité Militaire de Libération Nationale puis de la Deuxième République du Mali pendant plus de deux décennies.'
    },
    {
      id: 3,
      nom: 'Amadou Toumani Touré (ATT)',
      periode: '1991 - 1992 & 2002 - 2012',
      titre: 'Le Soldat de la Démocratie',
      biographie: 'Président du CTSP en 1991 initiant la transition démocratique, puis élu 3e président en 2002, célèbre pour ses grands chantiers d\'infrastructures.'
    },
    {
      id: 4,
      nom: 'Alpha Oumar Konaré',
      periode: '1992 - 2002',
      titre: 'Premier Président Démocratiquement Élu',
      biographie: 'Historien et archéologue, premier président de l’ère démocratique malienne (3e République), ayant accompli deux mandats constitutionnels.'
    },
    {
      id: 5,
      nom: 'Dioncounda Traoré',
      periode: '2012 - 2013',
      titre: 'Président de la Transition',
      biographie: 'Professeur d\'université et président de l’Assemblée Nationale, ayant dirigé la transition politique de 2012 à 2013.'
    },
    {
      id: 6,
      nom: 'Ibrahim Boubacar Keïta (IBK)',
      periode: '2013 - 2020',
      titre: 'Président de la République',
      biographie: 'Ancien Premier ministre et président de l’Assemblée Nationale, élu à la magistrature suprême en 2013 et réélu en 2018.'
    },
    {
      id: 7,
      nom: 'Assimi Goïta',
      periode: '2021 - Présent',
      titre: 'Général d\'Armée & Chef de l\'État',
      biographie: 'Président de la Transition, Chef de l\'État du Mali, engagé pour la refondation républicaine et la souveraineté nationale.'
    }
  ];

  getPresidents(): Observable<President[]> {
    return this.http.get<President[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les présidents, utilisation du cache local :', error);
        return of(this.fallbackPresidents);
      })
    );
  }

  getPresidentById(id: number | string): Observable<President> {
    return this.http.get<President>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackPresidents.find((p) => p.id === id);
        return of(found ?? { id, nom: 'Chef d\'État', periode: '' });
      })
    );
  }

  createPresident(president: President): Observable<President> {
    return this.http.post<President>(this.apiUrl, president).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du président :', error);
        const newPres: President = {
          ...president,
          id: Date.now()
        };
        this.fallbackPresidents.unshift(newPres);
        return of(newPres);
      })
    );
  }

  updatePresident(id: number | string, president: President): Observable<President> {
    return this.http.put<President>(`${this.apiUrl}/${id}`, president).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du président :', error);
        const index = this.fallbackPresidents.findIndex((p) => p.id === id);
        if (index !== -1) {
          this.fallbackPresidents[index] = { ...this.fallbackPresidents[index], ...president, id };
        }
        return of({ ...president, id });
      })
    );
  }

  deletePresident(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du président :', error);
        this.fallbackPresidents = this.fallbackPresidents.filter((p) => p.id !== id);
        return of(void 0);
      })
    );
  }
}
