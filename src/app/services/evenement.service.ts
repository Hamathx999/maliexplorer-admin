import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Evenement } from '../models/evenement.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EvenementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/evenements`;

  private fallbackEvenements: Evenement[] = [
    {
      id: 1,
      titre: 'Festival sur le Niger 2026',
      nomOrganisateur: 'Fondation Festival sur le Niger',
      emailOrganisateur: 'contact@festivsurniger.org',
      telephoneOrganisateur: '+223 21 32 02 12',
      dateDebut: '04/02/2026',
      dateFin: '08/02/2026',
      heureDebut: '10:00',
      heureFin: '23:30',
      lieu: 'Quai des Arts, Ségou',
      ville: 'Ségou',
      region: 'Ségou',
      categorie: 'Festival Culturel',
      statut: 'APPROUVE',
      description: 'Le plus grand rassemblement de musique, d’art contemporain, de danse et de conférences sur les rives du fleuve Niger.',
      prix: 'Gratuit / Pass Concerts 5 000 FCFA'
    },
    {
      id: 2,
      titre: 'La Nuit du Balafon de Sikasso',
      nomOrganisateur: 'Association Culturelle du Kénédougou',
      emailOrganisateur: 'kenedougou.art@gmail.com',
      telephoneOrganisateur: '+223 76 45 89 12',
      dateDebut: '15/03/2026',
      dateFin: '17/03/2026',
      heureDebut: '18:00',
      heureFin: '02:00',
      lieu: 'Stade Babemba Traoré, Sikasso',
      ville: 'Sikasso',
      region: 'Sikasso',
      categorie: 'Musique Traditionnelle',
      statut: 'APPROUVE',
      description: 'Célébration des maîtres du balafon sénoufo et mandingue avec des orchestres de toute la sous-région ouest-africaine.',
      prix: '2 000 FCFA'
    },
    {
      id: 3,
      titre: 'Festival International des Masques de Dogon (FIMA)',
      nomOrganisateur: 'Collectif des Guides de Bandiagara',
      emailOrganisateur: 'guides.bandiagara@yahoo.fr',
      telephoneOrganisateur: '+223 66 78 90 23',
      dateDebut: '22/04/2026',
      dateFin: '25/04/2026',
      heureDebut: '09:00',
      heureFin: '20:00',
      lieu: 'Sangha, Falaises de Bandiagara',
      ville: 'Bandiagara',
      region: 'Mopti',
      categorie: 'Traditions & Masques',
      statut: 'EN_ATTENTE',
      description: 'Démonstrations des danses de masques sur échasses, rituels ancestraux et immersion dans la cosmogonie dogon.',
      prix: '10 000 FCFA (Pass touristique)'
    },
    {
      id: 4,
      titre: 'Sanké Mô - Fête Rituelle de Pêche Sacrée',
      nomOrganisateur: 'Comité Coutumier de San',
      emailOrganisateur: 'mairie.san@afribone.net.ml',
      telephoneOrganisateur: '+223 70 12 34 56',
      dateDebut: '06/06/2026',
      dateFin: '06/06/2026',
      heureDebut: '07:00',
      heureFin: '18:00',
      lieu: 'Mare de Sanké, San',
      ville: 'San',
      region: 'Ségou / San',
      categorie: 'Patrimoine Immatériel UNESCO',
      statut: 'APPROUVE',
      description: 'Célébration séculaire de la pêche collective dans la mare sacrée de Sanké, classée au patrimoine immatériel de l’UNESCO.',
      prix: 'Gratuit'
    },
    {
      id: 5,
      titre: 'Exposition Biennale de la Photographie Africaine',
      nomOrganisateur: 'Musée National du Mali',
      emailOrganisateur: 'rencontres.bamako@maliart.org',
      telephoneOrganisateur: '+223 20 22 34 83',
      dateDebut: '10/11/2026',
      dateFin: '10/12/2026',
      heureDebut: '09:00',
      heureFin: '18:00',
      lieu: 'Musée National, Bamako',
      ville: 'Bamako',
      region: 'Bamako',
      categorie: 'Arts Visuels',
      statut: 'EN_ATTENTE',
      description: 'Les célèbres Rencontres de Bamako, plateforme panafricaine de la photographie contemporaine et des nouveaux médias.',
      prix: '1 000 FCFA'
    }
  ];

  getEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les événements, utilisation du cache local :', error);
        return of(this.fallbackEvenements);
      })
    );
  }

  getPendingEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(`${this.apiUrl}/en-attente`).pipe(
      catchError(() => {
        return of(this.fallbackEvenements.filter((e) => e.statut === 'EN_ATTENTE'));
      })
    );
  }

  getEvenementById(id: number | string): Observable<Evenement> {
    return this.http.get<Evenement>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackEvenements.find((e) => e.id === id);
        return of(found ?? { id, titre: 'Événement', description: '', dateDebut: '', lieu: '', statut: 'EN_ATTENTE' as const });
      })
    );
  }

  createEvenement(evenement: Evenement): Observable<Evenement> {
    return this.http.post<Evenement>(this.apiUrl, evenement).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local événement :', error);
        const newEvt: Evenement = {
          ...evenement,
          id: Date.now(),
          statut: evenement.statut || 'EN_ATTENTE'
        };
        this.fallbackEvenements.unshift(newEvt);
        return of(newEvt);
      })
    );
  }

  updateEvenement(id: number | string, evenement: Evenement): Observable<Evenement> {
    return this.http.put<Evenement>(`${this.apiUrl}/${id}`, evenement).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale événement :', error);
        const index = this.fallbackEvenements.findIndex((e) => e.id === id);
        if (index !== -1) {
          this.fallbackEvenements[index] = { ...this.fallbackEvenements[index], ...evenement, id };
        }
        return of({ ...evenement, id });
      })
    );
  }

  approveEvenement(id: number | string): Observable<Evenement> {
    return this.http.patch<Evenement>(`${this.apiUrl}/${id}/approuver`, {}).pipe(
      catchError(() => {
        const evt = this.fallbackEvenements.find((e) => e.id === id);
        if (evt) evt.statut = 'APPROUVE';
        return of(evt!);
      })
    );
  }

  rejectEvenement(id: number | string, motif?: string): Observable<Evenement> {
    return this.http.patch<Evenement>(`${this.apiUrl}/${id}/rejeter`, { motif }).pipe(
      catchError(() => {
        const evt = this.fallbackEvenements.find((e) => e.id === id);
        if (evt) {
          evt.statut = 'REFUSE';
          evt.motifRejet = motif;
        }
        return of(evt!);
      })
    );
  }

  deleteEvenement(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale événement :', error);
        this.fallbackEvenements = this.fallbackEvenements.filter((e) => e.id !== id);
        return of(void 0);
      })
    );
  }
}
