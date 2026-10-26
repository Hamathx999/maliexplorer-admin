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

        // Filtrer les comptes professionnels : seuls les comptes validés (statutModeration === 'VALIDE') figurent dans l'annuaire
        const professionalUsers = (Array.isArray(users) ? users : []).filter((u: User) => {
          const r = (u.role || '').toLowerCase();
          const isPro = r.includes('promoteur') || r.includes('guide') || r.includes('investisseur') || r.includes('partenaire');
          if (!isPro) return false;

          const opp = oppMap.get(Number(u.id));
          const mod = String(u.statutModeration || (opp ? opp.statutModeration : '') || '').toUpperCase();

          // Exigence stricte R2 : Seuls les guides et promoteurs ayant statutModeration === 'VALIDE' apparaissent dans l'annuaire
          if (r.includes('promoteur') || r.includes('guide')) {
            return mod === 'VALIDE';
          }

          // Pour les autres partenaires B2B (investisseurs), compte validé ou actif
          return mod === 'VALIDE' || u.statut === 'ACTIF';
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

          // Détails d'organisation et spécialité adaptés pour promoteurs et guides
          let organisation = u.nomOrganisation || (opp ? opp.nomOrganisation || opp.specialiteOuOrganisation : undefined);
          let specialite = u.langues || (u.experience ? `${u.experience} an(s) d'expérience` : undefined) || (opp ? opp.langue || opp.specialiteOuOrganisation : undefined);
          if (roleTitle === 'Guide' && !specialite) {
            specialite = 'Guide du patrimoine & visites touristiques';
          }

          return {
            id: Number(u.id),
            nomComplet,
            email: u.email,
            telephone: u.telephone || (opp ? opp.telephone : undefined),
            adresse: u.adresse || (opp ? opp.adresse : ''),
            photoUrl: u.photoUrl || (opp ? opp.photoUrl : ''),
            role: roleTitle,
            roleCode: u.role || 'partenaire',
            organisation,
            specialite,
            statutCompte: (u.statut === 'BLOQUE' ? 'BLOQUE' : 'ACTIF') as 'ACTIF' | 'BLOQUE',
            statutModeration: 'VALIDE',
            recherchePartenariat: opp ? opp.recherchePartenariat : Boolean(u.nomOrganisation || u.nomEvenement),
            titreProjet: opp ? opp.titreProjet : u.nomEvenement,
            besoinPartenariat: opp ? opp.besoinPartenariat : u.descriptionEvenement,
            dateCreation: u.dateInscription,
            pieceIdentite: u.pieceIdentite || (opp ? opp.pieceIdentite : undefined),
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
