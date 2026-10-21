/**
 * Modèles de données TypeScript pour les statistiques du tableau de bord d'administration MaliExplorer.
 * Conforme au contrat DTO exposé par Spring Boot (GET /api/admin/dashboard/stats)
 * et aux spécifications de la maquette Figma.
 */

export interface KpiStatsDTO {
  /** Total consolidé des contenus culturels et patrimoniaux publiés */
  contenusPublies: number;
  /** Tendance ou variation calculée (ex : "+12%") */
  contenusPubliesDelta?: string;
  /** Nombre d'éléments en attente de modération */
  enAttenteValidation: number;
  /** Niveau d'urgence (ex : "À traiter") */
  enAttenteValidationDelta?: string;
  /** Total des utilisateurs actifs inscrits */
  utilisateursActifs: number;
  /** Tendance d'acquisition (ex : "+8%") */
  utilisateursActifsDelta?: string;
  /** Total des comptes partenaires actifs (promoteurs, guides, investisseurs) */
  partenaires: number;
  /** Évolution des partenaires (ex : "+3 ce mois") */
  partenairesDelta?: string;
  /** Événements futurs programmés */
  evenementsAVenir: number;
  /** Statut ou mention des événements futurs */
  evenementsAVenirDelta?: string;
  /** Détails des contenus par type d'entité */
  detailsContenus?: Record<string, number>;
  /** Détails des partenaires par rôle */
  detailsPartenaires?: Record<string, number>;
}

export interface PointTemporelDTO {
  /** Libellé sur l'axe X (ex : "Lun", "S1", "Jan") */
  label: string;
  /** Valeur numérique consolidée de l'activité */
  valeur: number;
  /** Date au format ISO (ex : "2026-10-10") */
  date: string;
  /** Nombre de visiteurs uniques */
  visiteurs: number;
  /** Nombre total d'interactions ou pages vues */
  pagesVues: number;
  /** Nouvelles inscriptions */
  inscriptions?: number;
  /** Activités d'engagement (quiz, favoris, événements) */
  activites?: number;
  /** Coordonnées calculées pour le rendu SVG */
  x?: number;
  yVisiteurs?: number;
  yPagesVues?: number;
}

export interface SeriesTemporellesDTO {
  /** Données d'activité des 7 derniers jours */
  '7j'?: PointTemporelDTO[];
  septJours?: PointTemporelDTO[];
  /** Données d'activité des 30 derniers jours */
  '30j'?: PointTemporelDTO[];
  trenteJours?: PointTemporelDTO[];
  /** Données d'activité des 12 derniers mois */
  '12m'?: PointTemporelDTO[];
  douzeMois?: PointTemporelDTO[];
}

export interface ContenuCategorieDTO {
  /** Libellé convivial (ex : "Lieux historiques", "Villes", "Plats", "Articles", "Quiz") */
  categorie: string;
  /** Code technique (ex : "LIEUX", "VILLES", "PLATS", "ARTICLES", "QUIZ") */
  code?: string;
  /** Volume total enregistré */
  total: number;
  /** Pourcentage par rapport au total des catégories */
  pourcentage: number;
  /** Couleur hexadécimale de la jauge */
  couleur: string;
}

export interface RegionStatDTO {
  /** Identifiant unique de la région */
  idRegion?: number;
  /** Code ou trigramme (ex : "BKO", "SKO", "MOP") */
  code: string;
  /** Nom complet officiel */
  nom: string;
  /** Chef-lieu ou capitale administrative */
  chefLieu: string;
  /** Coordonnée X de projection SVG */
  x: number;
  /** Coordonnée Y de projection SVG */
  y: number;
  /** Indique si la région comporte des contenus actifs */
  actif: boolean;
  /** Total des entités culturelles associées */
  totalEntites: number;
  /** Nombre de villes associées */
  nombreVilles?: number;
  /** Nombre de lieux historiques situés dans la région */
  nombreLieux?: number;
  /** Nombre d'événements programmés dans la région */
  nombreEvenements?: number;
  svgPath?: string;
  lat?: number;
  lng?: number;
}

export interface StatistiquesRegionalesDTO {
  /** Total institutionnel officiel des régions (16 pour le Mali) */
  totalRegions: number;
  /** Nombre de régions disposant de contenus actifs */
  regionsActives: number;
  /** Taux d'activité en pourcentage (ex : 75.0%) */
  tauxActivite: number;
  /** Liste détaillée des 16 pôles régionaux */
  regions: RegionStatDTO[];
}

export interface ElementModerationDTO {
  /** Identifiant de la ressource */
  id: number | string;
  /** Type d'élément (ex : "Partenaire", "Guide", "Événement") */
  type: string;
  /** Titre ou dénomination */
  titre: string;
  /** Date de soumission formatée */
  date: string;
  /** Statut actuel (ex : "EN_ATTENTE") */
  statut: string;
  /** Route de navigation d'administration */
  urlAction: string;
  /** Demandeur ou porteur de projet */
  demandeur?: string;
  /** Détails succincts */
  details?: string;
  /** Image ou logo associé */
  imageUrl?: string;
}

export interface ActiviteRecenteDTO {
  /** Identifiant de l'activité */
  id: number | string;
  /** Type d'action (ex : "INSCRIPTION", "EVENEMENT", "QUIZ", "PARTENARIAT") */
  type: string;
  /** Titre explicite de l'activité */
  titre: string;
  /** Mention temporelle conviviale (ex : "Il y a 10 min") */
  date: string;
  /** Date ISO */
  dateIso?: string;
  /** Auteur de l'action */
  auteur: string;
  /** Description ou contexte */
  description?: string;
  /** Nom de l'icône vectorielle */
  icone?: string;
  /** Couleur thématique */
  couleur?: string;
}

export interface DashboardStatsResponseDTO {
  /** Horodatage de génération des statistiques */
  timestamp?: string;
  /** Compteurs KPI */
  kpis: KpiStatsDTO;
  /** Séries temporelles d'activité */
  seriesTemporelles: SeriesTemporellesDTO;
  /** Contenus les plus consultés par catégorie */
  contenusParCategorie: ContenuCategorieDTO[];
  /** Statistiques territoriales des 16 régions du Mali */
  statistiquesRegionales: StatistiquesRegionalesDTO;
  /** Éléments nécessitant une validation administrative */
  aValider: ElementModerationDTO[];
  /** Fil chronologique de l'activité récente */
  activiteRecente: ActiviteRecenteDTO[];
}
