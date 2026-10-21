import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DashboardStatsResponseDTO,
  PointTemporelDTO,
  ContenuCategorieDTO,
  StatistiquesRegionalesDTO,
  RegionStatDTO,
  ElementModerationDTO,
  ActiviteRecenteDTO
} from '../models/dashboard-stats.model';
import { LieuHistoriqueService } from './lieu-historique.service';
import { UserService } from './user.service';
import { EvenementService } from './evenement.service';
import { QuizService } from './quiz.service';
import { VilleService } from './ville.service';
import { PlatService } from './plat.service';

/**
 * Service Angular responsable de la récupération des métriques statistiques
 * consolidées pour le tableau de bord d'administration MaliExplorer.
 * Consomme l'endpoint Spring Boot GET /api/admin/dashboard/stats
 * et intègre un mode de repli résilient en cas d'indisponibilité temporaire du serveur.
 */
export interface PoleRegionConfig {
  code: string;
  nom: string;
  chefLieu: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  aliases: string[];
  svgPath: string;
}

export const POLES_REGIONAUX_CONFIG: PoleRegionConfig[] = [
  { code: 'BKO', nom: 'District de Bamako', chefLieu: 'Bamako', x: 173, y: 377, lat: 12.65, lng: -8.0, aliases: ['bamako', 'district de bamako', 'bko'], svgPath: 'M 165,365 L 185,365 L 182,385 L 163,385 Z' },
  { code: 'SKO', nom: 'Région de Sikasso', chefLieu: 'Sikasso', x: 244, y: 414, lat: 11.32, lng: -5.75, aliases: ['sikasso', 'sko', 'koutiala', 'bougouni'], svgPath: 'M 230,370 L 275,370 L 284.1,394.7 L 268.2,433.4 L 252.4,444.5 L 230.1,443.1 L 204.7,436.2 L 179.3,427.9 L 166.6,408.6 L 182,385 L 225,400 Z' },
  { code: 'SEG', nom: 'Région de Ségou', chefLieu: 'Ségou', x: 228, y: 355, lat: 13.43, lng: -6.26, aliases: ['segou', 'ségou', 'seg', 'markala'], svgPath: 'M 236.5,289.7 L 252.4,270.4 L 310,290 L 285,315 L 275,340 L 275,370 L 230,370 L 205,340 Z' },
  { code: 'MOP', nom: 'Région de Mopti', chefLieu: 'Mopti', x: 294, y: 326, lat: 14.49, lng: -4.18, aliases: ['mopti', 'mop', 'djenne', 'djenné', 'sevare', 'sévaré'], svgPath: 'M 310,290 L 350,285 L 350,335 L 315,350 L 275,340 L 285,315 Z' },
  { code: 'TBK', nom: 'Région de Tombouctou', chefLieu: 'Tombouctou', x: 332, y: 263, lat: 16.77, lng: -3.0, aliases: ['tombouctou', 'timbuktu', 'tbk'], svgPath: 'M 268.2,170 L 360,170 L 430,230 L 410,285 L 350,285 L 310,290 L 252.4,270.4 Z' },
  { code: 'GAO', nom: 'Région de Gao', chefLieu: 'Gao', x: 429, y: 277, lat: 16.27, lng: 0.05, aliases: ['gao', 'ansongo', 'bourem'], svgPath: 'M 460,256.6 L 470,295 L 484.2,306.3 L 452.5,313.2 L 433.4,311.8 L 410,285 L 430,230 Z' },
  { code: 'KYS', nom: 'Région de Kayes', chefLieu: 'Kayes', x: 64, y: 327, lat: 14.45, lng: -11.43, aliases: ['kayes', 'kys', 'bafoulabe', 'bafoulabé'], svgPath: 'M 39.5,318.8 L 45.9,306.3 L 77.6,298 L 100,330 L 80,360 L 52.2,378.2 L 39.5,353.3 Z' },
  { code: 'KOU', nom: 'Région de Koulikoro', chefLieu: 'Koulikoro', x: 187, y: 371, lat: 12.86, lng: -7.55, aliases: ['koulikoro', 'kou', 'kati'], svgPath: 'M 160,330 L 188.8,298 L 236.5,289.7 L 205,340 L 185,360 L 155,365 Z' },
  { code: 'KID', nom: 'Région de Kidal', chefLieu: 'Kidal', x: 472, y: 217, lat: 18.44, lng: 1.4, aliases: ['kidal', 'kid', 'tessalit'], svgPath: 'M 411.2,146.1 L 458.8,173.7 L 506.5,187.5 L 562.1,197.2 L 554.1,228.9 L 538.2,256.6 L 460,256.6 L 430,230 L 360,170 Z' },
  { code: 'MNK', nom: 'Région de Ménaka', chefLieu: 'Ménaka', x: 503, y: 287, lat: 15.91, lng: 2.4, aliases: ['menaka', 'ménaka', 'mnk'], svgPath: 'M 538.2,256.6 L 516,270.4 L 506.5,289.7 L 484.2,306.3 L 470,295 L 460,256.6 Z' },
  { code: 'TAO', nom: 'Région de Taoudénit', chefLieu: 'Taoudénit', x: 301, y: 100, lat: 22.68, lng: -3.98, aliases: ['taoudenit', 'taoudénit', 'tao'], svgPath: 'M 274.6,35.5 L 300,35.5 L 306.4,41.1 L 331.8,77 L 379.4,118.4 L 411.2,146.1 L 360,170 L 268.2,170 L 252.4,173.7 L 268.2,90.8 Z' },
  { code: 'NIO', nom: 'Région de Nioro', chefLieu: 'Nioro du Sahel', x: 123, y: 307, lat: 15.17, lng: -9.58, aliases: ['nioro', 'nioro du sahel', 'nio'], svgPath: 'M 77.6,298 L 125.3,295.3 L 157.1,292.5 L 188.8,298 L 160,330 L 100,330 Z' },
  { code: 'KIT', nom: 'Région de Kita', chefLieu: 'Kita', x: 126, y: 366, lat: 13.04, lng: -9.48, aliases: ['kita', 'kit'], svgPath: 'M 100,330 L 160,330 L 153.9,392 L 134.8,389.2 L 103.1,386.4 L 71.3,383.7 L 80,360 Z' },
  { code: 'DIO', nom: 'Région de Dioïla', chefLieu: 'Dioïla', x: 211, y: 381, lat: 12.49, lng: -6.79, aliases: ['dioila', 'dioïla', 'dio'], svgPath: 'M 185,365 L 205,340 L 230,370 L 225,400 L 182,385 Z' },
  { code: 'SAN', nom: 'Région de San', chefLieu: 'San', x: 271, y: 359, lat: 13.3, lng: -4.9, aliases: ['san'], svgPath: 'M 275,340 L 315,350 L 338.1,347.8 L 315.9,372.6 L 275,370 Z' },
  { code: 'BDO', nom: 'Région de Bandiagara', chefLieu: 'Bandiagara', x: 312, y: 330, lat: 14.35, lng: -3.61, aliases: ['bandiagara', 'pays dogon', 'bdo', 'dogon'], svgPath: 'M 350,285 L 410,285 L 422.3,317.4 L 401.6,331.2 L 369.9,336.7 L 350,335 Z' }
];

@Injectable({
  providedIn: 'root'
})
export class DashboardStatsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/dashboard/stats`;

  // Services injectés pour le mode de repli local si le backend est hors ligne
  private readonly lieuService = inject(LieuHistoriqueService);
  private readonly userService = inject(UserService);
  private readonly evenementService = inject(EvenementService);
  private readonly quizService = inject(QuizService);
  private readonly villeService = inject(VilleService);
  private readonly platService = inject(PlatService);

  /**
   * Récupère l'intégralité des statistiques du tableau de bord depuis Spring Boot.
   * En cas d'erreur réseau ou d'indisponibilité, bascule vers le calcul dynamique de secours.
   */
  getDashboardStats(): Observable<DashboardStatsResponseDTO> {
    return this.http.get<DashboardStatsResponseDTO>(this.apiUrl).pipe(
      map((response) => this.normaliserReponse(response)),
      catchError((error) => {
        console.warn('API /api/admin/dashboard/stats non accessible, activation du mode de secours local :', error);
        return this.genererStatsFallback();
      })
    );
  }

  /**
   * Normalise la structure reçue du backend Spring Boot pour garantir la cohérence
   * avec les clés JSON (@JsonProperty("7j"), etc.).
   */
  private normaliserReponse(dto: any): DashboardStatsResponseDTO {
    if (!dto) return this.construireStatsVides();

    // Normalisation des séries temporelles
    const seriesRaw = dto.seriesTemporelles || {};
    const septJours: PointTemporelDTO[] = seriesRaw['7j'] || seriesRaw.septJours || [];
    const trenteJours: PointTemporelDTO[] = seriesRaw['30j'] || seriesRaw.trenteJours || [];
    const douzeMois: PointTemporelDTO[] = seriesRaw['12m'] || seriesRaw.douzeMois || [];

    // Normalisation des 16 régions avec enrichissement géométrique officiel
    const rawRegions = Array.isArray(dto.statistiquesRegionales?.regions) && dto.statistiquesRegionales.regions.length > 0
      ? dto.statistiquesRegionales.regions
      : POLES_REGIONAUX_CONFIG;

    const regionsNormalisees: RegionStatDTO[] = rawRegions.map((r: any) => {
      const pConfig = POLES_REGIONAUX_CONFIG.find((p) => p.code === r.code);
      const nbLieux = r.nombreLieux ?? 0;
      const nbVilles = r.nombreVilles ?? 0;
      const nbEvts = r.nombreEvenements ?? 0;
      const total = r.totalEntites ?? (nbLieux + nbVilles + nbEvts);
      return {
        ...r,
        nom: r.nom || pConfig?.nom || '',
        chefLieu: r.chefLieu || pConfig?.chefLieu || '',
        x: r.x || pConfig?.x || 300,
        y: r.y || pConfig?.y || 240,
        lat: r.lat ?? pConfig?.lat ?? 12.65,
        lng: r.lng ?? pConfig?.lng ?? -8.00,
        svgPath: r.svgPath || pConfig?.svgPath || '',
        actif: r.actif ?? (total > 0),
        nombreLieux: nbLieux,
        nombreVilles: nbVilles,
        nombreEvenements: nbEvts,
        totalEntites: total
      };
    });

    return {
      timestamp: dto.timestamp || new Date().toISOString(),
      kpis: {
        contenusPublies: dto.kpis?.contenusPublies ?? 0,
        contenusPubliesDelta: dto.kpis?.contenusPubliesDelta || `${dto.kpis?.contenusPublies ?? 0} au total`,
        enAttenteValidation: dto.kpis?.enAttenteValidation ?? 0,
        enAttenteValidationDelta: dto.kpis?.enAttenteValidationDelta || (dto.kpis?.enAttenteValidation > 0 ? 'À traiter' : 'À jour'),
        utilisateursActifs: dto.kpis?.utilisateursActifs ?? 0,
        utilisateursActifsDelta: dto.kpis?.utilisateursActifsDelta || `${dto.kpis?.utilisateursActifs ?? 0} inscrits`,
        partenaires: dto.kpis?.partenaires ?? 0,
        partenairesDelta: dto.kpis?.partenairesDelta || 'Actifs',
        evenementsAVenir: dto.kpis?.evenementsAVenir ?? 0,
        evenementsAVenirDelta: dto.kpis?.evenementsAVenirDelta || 'À venir',
        detailsContenus: dto.kpis?.detailsContenus || {},
        detailsPartenaires: dto.kpis?.detailsPartenaires || {}
      },
      seriesTemporelles: {
        '7j': septJours,
        '30j': trenteJours,
        '12m': douzeMois,
        septJours,
        trenteJours,
        douzeMois
      },
      contenusParCategorie: Array.isArray(dto.contenusParCategorie) ? dto.contenusParCategorie : [],
      statistiquesRegionales: {
        totalRegions: dto.statistiquesRegionales?.totalRegions ?? 16,
        regionsActives: dto.statistiquesRegionales?.regionsActives ?? regionsNormalisees.filter((r) => r.actif).length,
        tauxActivite: dto.statistiquesRegionales?.tauxActivite ?? Math.round((regionsNormalisees.filter((r) => r.actif).length / 16) * 100),
        regions: regionsNormalisees
      },
      aValider: Array.isArray(dto.aValider) ? dto.aValider : [],
      activiteRecente: Array.isArray(dto.activiteRecente) ? dto.activiteRecente : []
    };
  }

  /**
   * Construit un jeu de données statistiques par défaut basé sur l'état des services locaux.
   */
  private genererStatsFallback(): Observable<DashboardStatsResponseDTO> {
    return forkJoin({
      lieux: this.lieuService.getLieux().pipe(catchError(() => of([]))),
      users: this.userService.getUsers().pipe(catchError(() => of([]))),
      events: this.evenementService.getEvenements().pipe(catchError(() => of([]))),
      quizzes: this.quizService.getQuiz().pipe(catchError(() => of([]))),
      villes: this.villeService.getVilles().pipe(catchError(() => of([]))),
      plats: this.platService.getPlats().pipe(catchError(() => of([])))
    }).pipe(
      map(({ lieux, users, events, quizzes, villes, plats }) => {
        const totalLieux = Array.isArray(lieux) ? lieux.length : 0;
        const totalUsers = Array.isArray(users) ? users.length : 0;
        const totalEvents = Array.isArray(events) ? events.length : 0;
        const totalQuizzes = Array.isArray(quizzes) ? quizzes.length : 0;
        const totalVilles = Array.isArray(villes) ? villes.length : 0;
        const totalPlats = Array.isArray(plats) ? plats.length : 0;

        const totalContenus = totalLieux + totalVilles + totalPlats + totalQuizzes + totalEvents;

        // Partenaires filtrés parmi les utilisateurs
        const partenairesList = (Array.isArray(users) ? users : []).filter((u) => {
          const r = (u.role || '').toLowerCase();
          return r.includes('partenaire') || r.includes('promoteur') || r.includes('guide') || r.includes('investisseur');
        });
        const totalPartenaires = partenairesList.length;

        // Événements et fiches en attente
        const eventsEnAttente = (Array.isArray(events) ? events : []).filter((e) => e.statut === 'EN_ATTENTE');
        const enAttenteTotal = eventsEnAttente.length;

        // Événements à venir
        const now = new Date();
        const evenementsAVenir = (Array.isArray(events) ? events : []).filter((e) => {
          if (!e.dateDebut) return true;
          try {
            return new Date(e.dateDebut) >= now;
          } catch {
            return true;
          }
        }).length;

        // Répartition des contenus les plus consultés
        const totalRepartition = totalContenus > 0 ? totalContenus : 1;
        const contenusParCategorie: ContenuCategorieDTO[] = [
          {
            categorie: 'Lieux historiques',
            code: 'LIEUX',
            total: totalLieux,
            pourcentage: Math.round((totalLieux / totalRepartition) * 100),
            couleur: '#075E4D'
          },
          {
            categorie: 'Villes',
            code: 'VILLES',
            total: totalVilles,
            pourcentage: Math.round((totalVilles / totalRepartition) * 100),
            couleur: '#D6A23A'
          },
          {
            categorie: 'Plats',
            code: 'PLATS',
            total: totalPlats,
            pourcentage: Math.round((totalPlats / totalRepartition) * 100),
            couleur: '#2E7D32'
          },
          {
            categorie: 'Articles & Guides',
            code: 'ARTICLES',
            total: totalEvents,
            pourcentage: Math.round((totalEvents / totalRepartition) * 100),
            couleur: '#1976D2'
          },
          {
            categorie: 'Quiz',
            code: 'QUIZ',
            total: totalQuizzes,
            pourcentage: Math.round((totalQuizzes / totalRepartition) * 100),
            couleur: '#8E24AA'
          }
        ];

        const matchRegionPole = (val: string | undefined, aliases: string[]): boolean => {
          if (!val || typeof val !== 'string') return false;
          const str = val.toLowerCase().trim();
          return aliases.some((a) => str.includes(a.toLowerCase()));
        };

        // Calcul territorial officiel basé 100% sur les contenus réels enregistrés
        const regionsFallback: RegionStatDTO[] = POLES_REGIONAUX_CONFIG.map((pole) => {
          const nbLieux = (Array.isArray(lieux) ? lieux : []).filter((l: any) =>
            matchRegionPole(l.region, pole.aliases) || matchRegionPole(l.ville, pole.aliases) || matchRegionPole(l.nom, pole.aliases)
          ).length;

          const nbVilles = (Array.isArray(villes) ? villes : []).filter((v: any) =>
            matchRegionPole(v.region, pole.aliases) || matchRegionPole(v.nom, pole.aliases)
          ).length;

          const nbEvenements = (Array.isArray(events) ? events : []).filter((e: any) =>
            matchRegionPole(e.region, pole.aliases) || matchRegionPole(e.ville, pole.aliases) || matchRegionPole(e.lieu, pole.aliases)
          ).length;

          const totalEntites = nbLieux + nbVilles + nbEvenements;
          const actif = totalEntites > 0;

          return {
            code: pole.code,
            nom: pole.nom,
            chefLieu: pole.chefLieu,
            x: pole.x,
            y: pole.y,
            lat: pole.lat,
            lng: pole.lng,
            actif,
            totalEntites,
            nombreLieux: nbLieux,
            nombreVilles: nbVilles,
            nombreEvenements: nbEvenements,
            svgPath: pole.svgPath
          };
        });

        const regionsActives = regionsFallback.filter((r) => r.actif).length;
        const tauxActivite = Math.round((regionsActives / 16) * 100);

        // Séries temporelles calculées dynamiquement à partir des données réelles
        const joursSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        // 1. Série 7 jours récents
        const septJours: PointTemporelDTO[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const jourLabel = joursSemaine[d.getDay()];
          const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          const isoDate = d.toISOString().split('T')[0];

          const userCount = (Array.isArray(users) ? users : []).filter((u: any) => {
            const raw = u.dateInscription || u.dateCreation || u.createdAt;
            return raw && typeof raw === 'string' && raw.startsWith(isoDate);
          }).length;

          const eventCount = (Array.isArray(events) ? events : []).filter((e: any) => {
            const raw = e.dateSoumission || e.dateCreation || e.dateDebut;
            return raw && typeof raw === 'string' && raw.startsWith(isoDate);
          }).length;

          const valeur = userCount + eventCount;
          const visiteurs = valeur;
          const pagesVues = valeur > 0 ? valeur * 3 : 0;

          septJours.push({
            label: jourLabel,
            valeur,
            date: dateStr,
            visiteurs,
            pagesVues
          });
        }

        // 2. Série 30 jours (4 semaines S1..S4)
        const trenteJours: PointTemporelDTO[] = [];
        for (let k = 0; k < 4; k++) {
          const daysStart = (3 - k) * 7;
          const daysEnd = daysStart - 6;
          const start = new Date(now);
          start.setDate(start.getDate() - daysStart);
          const end = new Date(now);
          end.setDate(end.getDate() - Math.max(0, daysEnd));

          const userCount = (Array.isArray(users) ? users : []).filter((u: any) => {
            const raw = u.dateInscription || u.dateCreation || u.createdAt;
            if (!raw || typeof raw !== 'string') return false;
            const itemDate = new Date(raw.split('T')[0]);
            return !isNaN(itemDate.getTime()) && itemDate >= start && itemDate <= end;
          }).length;

          const eventCount = (Array.isArray(events) ? events : []).filter((e: any) => {
            const raw = e.dateSoumission || e.dateCreation || e.dateDebut;
            if (!raw || typeof raw !== 'string') return false;
            const itemDate = new Date(raw.split('T')[0]);
            return !isNaN(itemDate.getTime()) && itemDate >= start && itemDate <= end;
          }).length;

          const valeur = userCount + eventCount;
          const visiteurs = valeur;
          const pagesVues = valeur > 0 ? valeur * 3 : 0;

          trenteJours.push({
            label: `S${k + 1}`,
            valeur,
            date: `Semaine ${k + 1}`,
            visiteurs,
            pagesVues
          });
        }

        // 3. Série 12 mois récents
        const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const douzeMois: PointTemporelDTO[] = [];
        for (let m = 11; m >= 0; m--) {
          const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
          const yyyy = d.getFullYear();
          const mm = d.getMonth();
          const label = moisNoms[mm];
          const dateStr = `${String(mm + 1).padStart(2, '0')}/${yyyy}`;

          const userCount = (Array.isArray(users) ? users : []).filter((u: any) => {
            const raw = u.dateInscription || u.dateCreation || u.createdAt;
            if (!raw || typeof raw !== 'string') return false;
            const itemDate = new Date(raw);
            return !isNaN(itemDate.getTime()) && itemDate.getFullYear() === yyyy && itemDate.getMonth() === mm;
          }).length;

          const eventCount = (Array.isArray(events) ? events : []).filter((e: any) => {
            const raw = e.dateSoumission || e.dateCreation || e.dateDebut;
            if (!raw || typeof raw !== 'string') return false;
            const itemDate = new Date(raw);
            return !isNaN(itemDate.getTime()) && itemDate.getFullYear() === yyyy && itemDate.getMonth() === mm;
          }).length;

          const valeur = userCount + eventCount;
          const visiteurs = valeur;
          const pagesVues = valeur > 0 ? valeur * 3 : 0;

          douzeMois.push({
            label,
            valeur,
            date: dateStr,
            visiteurs,
            pagesVues
          });
        }

        // Éléments en attente de validation
        const aValider: ElementModerationDTO[] = eventsEnAttente.slice(0, 4).map((e) => ({
          id: e.id || 0,
          type: 'Événement',
          titre: e.titre || 'Événement culturel',
          date: e.dateDebut || 'Récemment soumis',
          statut: 'EN_ATTENTE',
          urlAction: `/validation-evenement/${e.id}`,
          demandeur: e.nomOrganisateur || 'Promoteur culturel',
          details: e.description || '',
          imageUrl: e.imageUrl || '/assets/MaliExplorer.png'
        }));

        // Agrégation de l'activité récente réelle (Inscriptions, Événements, Quiz, Lieux)
        const activitesCandidates: (ActiviteRecenteDTO & { timestampRaw: number })[] = [];

        // 1. Inscriptions d'utilisateurs
        (Array.isArray(users) ? users : []).forEach((u: any, idx: number) => {
          const raw = u.dateInscription || u.dateCreation || u.createdAt;
          const dt = raw ? new Date(raw) : null;
          const isValid = dt && !isNaN(dt.getTime());
          const time = isValid ? dt.getTime() : (now.getTime() - (idx + 1) * 3600000 * 24);
          const nomComplet = [u.prenom, u.nom].filter(Boolean).join(' ').trim() || u.email || 'Utilisateur';
          const roleLabel = u.role || 'Explorateur';

          activitesCandidates.push({
            id: `user-${u.id ?? idx}`,
            type: 'INSCRIPTION',
            titre: `Nouveau ${roleLabel.toLowerCase()} : ${nomComplet}`,
            date: isValid ? this.formaterDateRelative(dt) : (u.dateInscription || 'Récemment'),
            dateIso: isValid ? dt.toISOString() : undefined,
            auteur: nomComplet,
            description: `${nomComplet} • Inscription au statut ${roleLabel}`,
            icone: 'user-plus',
            couleur: '#0E8F76',
            timestampRaw: time
          });
        });

        // 2. Événements réels soumis ou programmés
        (Array.isArray(events) ? events : []).forEach((e: any, idx: number) => {
          const raw = e.dateSoumission || e.dateCreation || e.dateDebut;
          const dt = raw ? new Date(raw) : null;
          const isValid = dt && !isNaN(dt.getTime());
          const time = isValid ? dt.getTime() : (now.getTime() - (idx + 1) * 3600000 * 12);
          const orga = e.nomOrganisateur || 'Promoteur';
          const villeStr = e.ville || e.lieu || 'Mali';

          activitesCandidates.push({
            id: `evt-${e.id ?? idx}`,
            type: 'EVENEMENT',
            titre: `Événement : ${e.titre || 'Culturel'}`,
            date: isValid ? this.formaterDateRelative(dt) : (e.dateDebut || 'Programmé'),
            dateIso: isValid ? dt.toISOString() : undefined,
            auteur: orga,
            description: `${orga} • ${villeStr}`,
            icone: 'calendar',
            couleur: '#D97706',
            timestampRaw: time
          });
        });

        // 3. Quiz réels enregistrés
        (Array.isArray(quizzes) ? quizzes : []).forEach((q: any, idx: number) => {
          const time = now.getTime() - (idx + 2) * 3600000 * 36;
          activitesCandidates.push({
            id: `quiz-${q.id ?? idx}`,
            type: 'QUIZ',
            titre: `Quiz : ${q.nomQuiz || 'Défi culturel'}`,
            date: 'Disponible',
            auteur: 'MaliExplorer Académie',
            description: `${q.points || 50} pts de découverte • ${q.categorie || 'Patrimoine'}`,
            icone: 'award',
            couleur: '#8E24AA',
            timestampRaw: time
          });
        });

        // Tri chronologique décroissant (les plus récents en premier)
        activitesCandidates.sort((a, b) => b.timestampRaw - a.timestampRaw);

        // 5 actions récentes réelles
        const activiteRecente: ActiviteRecenteDTO[] = activitesCandidates.slice(0, 5);

        return {
          timestamp: new Date().toISOString(),
          kpis: {
            contenusPublies: totalContenus,
            contenusPubliesDelta: `${totalContenus} fiches au total`,
            enAttenteValidation: enAttenteTotal,
            enAttenteValidationDelta: enAttenteTotal > 0 ? 'À traiter' : 'À jour',
            utilisateursActifs: totalUsers,
            utilisateursActifsDelta: `${totalUsers} inscrits`,
            partenaires: totalPartenaires,
            partenairesDelta: `${totalPartenaires} actifs`,
            evenementsAVenir: evenementsAVenir,
            evenementsAVenirDelta: 'À venir'
          },
          seriesTemporelles: {
            '7j': septJours,
            '30j': trenteJours,
            '12m': douzeMois,
            septJours,
            trenteJours,
            douzeMois
          },
          contenusParCategorie,
          statistiquesRegionales: {
            totalRegions: 16,
            regionsActives,
            tauxActivite,
            regions: regionsFallback
          },
          aValider,
          activiteRecente
        };
      })
    );
  }

  private formaterDateRelative(dateInput: any): string {
    if (!dateInput) return 'Récemment';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : 'Récemment';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) {
      return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return diffMins <= 1 ? "À l'instant" : `Il y a ${diffMins} min`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
      return `Aujourd'hui à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return `Hier à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  private construireStatsVides(): DashboardStatsResponseDTO {
    return {
      timestamp: new Date().toISOString(),
      kpis: {
        contenusPublies: 0,
        enAttenteValidation: 0,
        utilisateursActifs: 0,
        partenaires: 0,
        evenementsAVenir: 0
      },
      seriesTemporelles: {
        '7j': [],
        '30j': [],
        '12m': []
      },
      contenusParCategorie: [],
      statistiquesRegionales: {
        totalRegions: 16,
        regionsActives: 0,
        tauxActivite: 0,
        regions: []
      },
      aValider: [],
      activiteRecente: []
    };
  }
}
