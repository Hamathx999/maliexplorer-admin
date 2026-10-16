import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { UserService } from './user.service';
import { ModerationPartenaireService } from './moderation-partenaire.service';
import { PartenaireItem } from '../models/partenaire.model';
import { User } from '../models/user.model';

/**
 * Service pour la gestion et la consultation des partenaires professionnels
 * de la plateforme MaliExplorer (Promoteurs culturels, Guides certifiés, Investisseurs).
 */
@Injectable({
  providedIn: 'root'
})
export class PartenaireService {
  private readonly userService = inject(UserService);
  private readonly moderationService = inject(ModerationPartenaireService);

  /**
   * Récupère la liste consolidée des partenaires professionnels
   * en agrégeant les utilisateurs aux rôles professionnels et les opportunités associées.
   */
  getPartenaires(): Observable<PartenaireItem[]> {
    return forkJoin({
      users: this.userService.getUsers().pipe(catchError(() => of([]))),
      opportunites: this.moderationService.getOpportunitesValidees().pipe(catchError(() => of([])))
    }).pipe(
      map(({ users, opportunites }) => {
        const oppMap = new Map<number, any>();
        opportunites.forEach((o) => {
          if (o.idUsers) oppMap.set(o.idUsers, o);
        });

        // Filtrer les comptes ayant un rôle professionnel
        const professionalUsers = (Array.isArray(users) ? users : []).filter((u: User) => {
          const r = (u.role || '').toLowerCase();
          return r.includes('promoteur') || r.includes('guide') || r.includes('investisseur') || r.includes('partenaire');
        });

        // Mapper chaque utilisateur vers un PartenaireItem riche
        return professionalUsers.map((u: User) => {
          const opp = oppMap.get(Number(u.id));
          const rLower = (u.role || '').toLowerCase();

          let roleTitle: 'Promoteur' | 'Guide' | 'Investisseur' | 'Partenaire' = 'Partenaire';
          if (rLower.includes('promoteur')) roleTitle = 'Promoteur';
          else if (rLower.includes('guide')) roleTitle = 'Guide';
          else if (rLower.includes('investisseur')) roleTitle = 'Investisseur';

          const nomComplet = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email;

          return {
            id: Number(u.id),
            nomComplet,
            email: u.email,
            telephone: u.telephone,
            adresse: u.adresse || (opp ? opp.adresse : ''),
            photoUrl: u.photoUrl || (opp ? opp.photoUrl : ''),
            role: roleTitle,
            roleCode: u.role || 'partenaire',
            organisation: u.nomOrganisation || (opp ? opp.specialiteOuOrganisation : undefined),
            specialite: u.experience || (opp ? opp.specialiteOuOrganisation : undefined),
            statutCompte: (u.statut === 'BLOQUE' ? 'BLOQUE' : 'ACTIF') as 'ACTIF' | 'BLOQUE',
            statutModeration: u.statutModeration || (opp ? opp.statutModeration : 'VALIDE'),
            recherchePartenariat: opp ? opp.recherchePartenariat : Boolean(u.nomOrganisation || u.nomEvenement),
            titreProjet: opp ? opp.titreProjet : u.nomEvenement,
            besoinPartenariat: opp ? opp.besoinPartenariat : u.descriptionEvenement,
            dateCreation: u.dateInscription,
            pieceIdentite: u.pieceIdentite,
            piecesJustificatifs: u.piecesJustificatifs || u.photoPieceOrganisation,
            description: u.description || u.descriptionEvenement
          };
        });
      })
    );
  }

  /**
   * Bascule le statut d'un compte partenaire (Actif / Bloqué).
   */
  toggleStatutPartenaire(id: number): Observable<any> {
    return this.userService.toggleBlockUser(id);
  }
}
