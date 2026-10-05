import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Ville } from '../models/ville.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VilleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/villes`;

  private fallbackVilles: Ville[] = [
    { id: 1, nom: 'Bamako', region: 'Bamako (District)', population: '2 800 000 hab', description: 'Capitale politique, économique et carrefour culturel du Mali sur le fleuve Niger.' },
    { id: 2, nom: 'Djenné', region: 'Mopti', population: '35 000 hab', description: 'Cité millénaire réputée pour sa Grande Mosquée en terre crue inscrite au patrimoine mondial.' },
    { id: 3, nom: 'Tombouctou', region: 'Tombouctou', population: '55 000 hab', description: 'La cité aux 333 saints, haut lieu historique du commerce transsaharien et des manuscrits anciens.' },
    { id: 4, nom: 'Mopti', region: 'Mopti', population: '150 000 hab', description: 'La « Venise malienne », confluence majeure du Niger et du Bani et carrefour fluvial.' },
    { id: 5, nom: 'Ségou', region: 'Ségou', population: '135 000 hab', description: 'Cité des balanzans, ancienne capitale du grand Royaume bambara de Ségou.' },
    { id: 6, nom: 'Sikasso', region: 'Sikasso', population: '225 000 hab', description: 'Capitale du Kénédougou, poumon agricole et carrefour transfrontalier verdoyant.' },
    { id: 7, nom: 'Gao', region: 'Gao', population: '90 000 hab', description: 'Ancienne capitale de l’Empire Songhaï, abritant le tombeau des Askia.' },
    { id: 8, nom: 'Kayes', region: 'Kayes', population: '130 000 hab', description: 'La cité du rail et des chutes du Félou, porte d’entrée occidentale du Mali.' },
    { id: 9, nom: 'Koulikoro', region: 'Koulikoro', population: '45 000 hab', description: 'Terminus ferroviaire et port fluvial de départ vers le nord.' },
    { id: 10, nom: 'Kidal', region: 'Kidal', population: '25 000 hab', description: 'Cité de l’Adrar des Ifoghas et berceau de la culture touarègue.' }
  ];

  getVilles(): Observable<Ville[]> {
    return this.http.get<Ville[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les villes, utilisation du cache local :', error);
        return of(this.fallbackVilles);
      })
    );
  }

  getVillesByRegion(regionName: string): Observable<Ville[]> {
    return this.http.get<Ville[]>(`${this.apiUrl}?region=${encodeURIComponent(regionName)}`).pipe(
      catchError(() => {
        return of(this.fallbackVilles.filter((v) => v.region.toLowerCase().includes(regionName.toLowerCase())));
      })
    );
  }

  getVilleById(id: number | string): Observable<Ville> {
    return this.http.get<Ville>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackVilles.find((v) => v.id === id);
        return of(found ?? { id, nom: 'Ville', region: 'Mali' });
      })
    );
  }

  createVille(ville: Ville): Observable<Ville> {
    return this.http.post<Ville>(this.apiUrl, ville).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de la ville :', error);
        const newVille: Ville = {
          ...ville,
          id: Date.now()
        };
        this.fallbackVilles.unshift(newVille);
        return of(newVille);
      })
    );
  }

  updateVille(id: number | string, ville: Ville): Observable<Ville> {
    return this.http.put<Ville>(`${this.apiUrl}/${id}`, ville).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de la ville :', error);
        const index = this.fallbackVilles.findIndex((v) => v.id === id);
        if (index !== -1) {
          this.fallbackVilles[index] = { ...this.fallbackVilles[index], ...ville, id };
        }
        return of({ ...ville, id });
      })
    );
  }

  deleteVille(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de la ville :', error);
        this.fallbackVilles = this.fallbackVilles.filter((v) => v.id !== id);
        return of(void 0);
      })
    );
  }
}
