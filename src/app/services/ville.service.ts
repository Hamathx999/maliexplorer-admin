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

  private readonly STORAGE_KEY = 'maliexplorer_villes_custom';

  private fallbackVilles: Ville[] = [
    // { id: 1, nom: 'Bamako', region: 'Bamako (District)', population: '2 800 000 hab', description: 'Capitale politique, économique et carrefour culturel du Mali sur le fleuve Niger.' },
    // { id: 2, nom: 'Djenné', region: 'Mopti', population: '35 000 hab', description: 'Cité millénaire réputée pour sa Grande Mosquée en terre crue inscrite au patrimoine mondial.' },
    // { id: 3, nom: 'Tombouctou', region: 'Tombouctou', population: '55 000 hab', description: 'La cité aux 333 saints, haut lieu historique du commerce transsaharien et des manuscrits anciens.' },
    // { id: 4, nom: 'Mopti', region: 'Mopti', population: '150 000 hab', description: 'La « Venise malienne », confluence majeure du Niger et du Bani et carrefour fluvial.' },
    // { id: 5, nom: 'Ségou', region: 'Ségou', population: '135 000 hab', description: 'Cité des balanzans, ancienne capitale du grand Royaume bambara de Ségou.' },
    // { id: 6, nom: 'Sikasso', region: 'Sikasso', population: '225 000 hab', description: 'Capitale du Kénédougou, poumon agricole et carrefour transfrontalier verdoyant.' },
    // { id: 7, nom: 'Gao', region: 'Gao', population: '90 000 hab', description: 'Ancienne capitale de l’Empire Songhaï, abritant le tombeau des Askia.' },
    // { id: 8, nom: 'Kayes', region: 'Kayes', population: '130 000 hab', description: 'La cité du rail et des chutes du Félou, porte d’entrée occidentale du Mali.' },
    // { id: 9, nom: 'Koulikoro', region: 'Koulikoro', population: '45 000 hab', description: 'Terminus ferroviaire et port fluvial de départ vers le nord.' },
    // { id: 10, nom: 'Kidal', region: 'Kidal', population: '25 000 hab', description: 'Cité de l’Adrar des Ifoghas et berceau de la culture touarègue.' }
  ];

  private getLocalVilles(): Ville[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage villes', e);
    }
    return [...this.fallbackVilles];
  }

  private saveLocalVilles(villes: Ville[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(villes));
    } catch (e) {
      console.warn('Erreur écriture localStorage villes', e);
    }
  }

  getVilles(): Observable<Ville[]> {
    return this.http.get<Ville[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les villes, utilisation du stockage local :', error);
        return of(this.getLocalVilles());
      })
    );
  }

  getVillesByRegion(regionName: string): Observable<Ville[]> {
    return this.http.get<Ville[]>(`${this.apiUrl}?region=${encodeURIComponent(regionName)}`).pipe(
      catchError(() => {
        return of(this.getLocalVilles().filter((v) => v.region.toLowerCase().includes(regionName.toLowerCase())));
      })
    );
  }

  getVilleById(id: number | string): Observable<Ville> {
    return this.http.get<Ville>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalVilles();
        const found = local.find((v) => String(v.id) === String(id));
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
        const current = this.getLocalVilles();
        current.unshift(newVille);
        this.saveLocalVilles(current);
        return of(newVille);
      })
    );
  }

  updateVille(id: number | string, ville: Ville): Observable<Ville> {
    return this.http.put<Ville>(`${this.apiUrl}/${id}`, ville).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de la ville :', error);
        const current = this.getLocalVilles();
        const index = current.findIndex((v) => String(v.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...ville, id };
          this.saveLocalVilles(current);
        }
        return of({ ...ville, id });
      })
    );
  }

  deleteVille(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de la ville :', error);
        const current = this.getLocalVilles().filter((v) => String(v.id) !== String(id));
        this.saveLocalVilles(current);
        return of(void 0);
      })
    );
  }
}
