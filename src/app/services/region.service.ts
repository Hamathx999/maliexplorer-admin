import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Region } from '../models/region.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RegionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/regions`;

  private fallbackRegions: Region[] = [
    { id: 1, nom: 'Kayes', chefLieu: 'Kayes', population: '1 996 812', superficie: '119 743 km²', description: 'Première région administrative du Mali, frontière avec le Sénégal et la Mauritanie, connue pour ses gisements d’or et ses chutes d’eau.' },
    { id: 2, nom: 'Koulikoro', chefLieu: 'Koulikoro', population: '2 418 305', superficie: '95 848 km²', description: 'Région ceinturant le district de Bamako, haut lieu d’histoire mandingue.' },
    { id: 3, nom: 'Sikasso', chefLieu: 'Sikasso', population: '2 625 919', superficie: '70 280 km²', description: 'Le grenier agricole du Mali, pays du Kénédougou et du célèbre Tata de Sikasso.' },
    { id: 4, nom: 'Ségou', chefLieu: 'Ségou', population: '2 336 255', superficie: '64 821 km²', description: 'Cité des balanzans et ancienne capitale du royaume Bambara.' },
    { id: 5, nom: 'Mopti', chefLieu: 'Mopti', population: '2 037 330', superficie: '79 017 km²', description: 'Au cœur du delta intérieur du Niger, abritant Djenné et les falaises de Bandiagara.' },
    { id: 6, nom: 'Tombouctou', chefLieu: 'Tombouctou', population: '681 691', superficie: '496 611 km²', description: 'Région mythique du nord, carrefour du désert et détentrice des précieux manuscrits anciens.' },
    { id: 7, nom: 'Gao', chefLieu: 'Gao', population: '544 120', superficie: '170 572 km²', description: 'Ancien siège de l’Empire Songhaï sur les rives du fleuve Niger.' },
    { id: 8, nom: 'Kidal', chefLieu: 'Kidal', population: '67 638', superficie: '151 430 km²', description: 'Région montagneuse de l’Adrar des Ifoghas, riche en gravures rupestres et traditions nomades.' },
    { id: 9, nom: 'Taoudénit', chefLieu: 'Taoudénit', population: '20 000', superficie: '323 326 km²', description: 'Célèbre pour ses mines de sel gemme au cœur du Sahara.' },
    { id: 10, nom: 'Ménaka', chefLieu: 'Ménaka', population: '54 456', superficie: '81 440 km²', description: 'Région sahélienne de l’Azawagh aux riches traditions pastorales.' },
    { id: 11, nom: 'Nioro', chefLieu: 'Nioro du Sahel', population: '250 000', superficie: '23 000 km²', description: 'Grand centre spirituel et commercial du Sahel occidental.' },
    { id: 12, nom: 'Kita', chefLieu: 'Kita', population: '430 000', superficie: '35 000 km²', description: 'Capitale du folklore mandingue et carrefour arachidier.' },
    { id: 13, nom: 'Dioïla', chefLieu: 'Dioïla', population: '490 000', superficie: '12 300 km²', description: 'Zone majeure de production cotonnière du Banico.' },
    { id: 14, nom: 'Nara', chefLieu: 'Nara', population: '300 000', superficie: '30 000 km²', description: 'Haut lieu de convergence pastorale et historique du Ouagadou.' },
    { id: 15, nom: 'Bougouni', chefLieu: 'Bougouni', population: '500 000', superficie: '20 000 km²', description: 'Cœur du Banimonotié et carrefour minier et agricole.' },
    { id: 16, nom: 'Koutiala', chefLieu: 'Koutiala', population: '600 000', superficie: '18 000 km²', description: 'Capitale malienne de l’or blanc (coton).' },
    { id: 17, nom: 'San', chefLieu: 'San', population: '350 000', superficie: '7 262 km²', description: 'Célèbre pour le Sanké mô (pêche sacrée rituelle classée UNESCO).' },
    { id: 18, nom: 'Douentza', chefLieu: 'Douentza', population: '250 000', superficie: '23 312 km²', description: 'Porte d’entrée du Gourma et sanctuaire des éléphants du désert.' },
    { id: 19, nom: 'Bandiagara', chefLieu: 'Bandiagara', population: '320 000', superficie: '8 900 km²', description: 'Pays Dogon et falaises millénaires inscrites au patrimoine mondial.' },
    { id: 20, nom: 'District de Bamako', chefLieu: 'Bamako', population: '2 800 000', superficie: '252 km²', description: 'Centre politique, économique, universitaire et culturel du Mali.' }
  ];

  getRegions(): Observable<Region[]> {
    return this.http.get<Region[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les régions, utilisation du cache local :', error);
        return of(this.fallbackRegions);
      })
    );
  }

  getRegionById(id: number | string): Observable<Region> {
    return this.http.get<Region>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackRegions.find((r) => r.id === id);
        return of(found ?? { id, nom: 'Région' });
      })
    );
  }

  createRegion(region: Region): Observable<Region> {
    return this.http.post<Region>(this.apiUrl, region).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local région :', error);
        const newRegion: Region = {
          ...region,
          id: Date.now()
        };
        this.fallbackRegions.unshift(newRegion);
        return of(newRegion);
      })
    );
  }

  updateRegion(id: number | string, region: Region): Observable<Region> {
    return this.http.put<Region>(`${this.apiUrl}/${id}`, region).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale région :', error);
        const index = this.fallbackRegions.findIndex((r) => r.id === id);
        if (index !== -1) {
          this.fallbackRegions[index] = { ...this.fallbackRegions[index], ...region, id };
        }
        return of({ ...region, id });
      })
    );
  }

  deleteRegion(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale région :', error);
        this.fallbackRegions = this.fallbackRegions.filter((r) => r.id !== id);
        return of(void 0);
      })
    );
  }
}
