import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardStatsService } from '../../services/dashboard-stats.service';
import {
  DashboardStatsResponseDTO,
  PointTemporelDTO,
  ContenuCategorieDTO,
  RegionStatDTO,
  ElementModerationDTO,
  ActiviteRecenteDTO
} from '../../models/dashboard-stats.model';

export interface KpiDisplayCard {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
  deltaType: 'positive' | 'warning' | 'neutral';
  icon: 'layers' | 'clock' | 'users' | 'handshake' | 'calendar';
  iconBg: string;
  iconColor: string;
  isAlert?: boolean;
}

export interface ChartTooltipData {
  label: string;
  date: string;
  visiteurs: number;
  pagesVues: number;
  valeur: number;
  x: number;
  yVisiteurs: number;
  yPagesVues: number;
}

/**
 * Composant principal du Tableau de Bord d'Administration MaliExplorer.
 * Modernisé selon la maquette Figma officielle avec :
 * - 5 Cartes KPI supérieures
 * - Courbe interactive multi-périodes (7j / 30j / 12m) avec recalcul SVG dynamique et tooltips
 * - Jauges colorées des contenus les plus consultés par catégorie
 * - Carte vectorielle SVG interactive du Mali avec pôles régionaux
 * - Tableau de modération « À valider »
 * - Timeline chronologique d'activité récente
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly statsService = inject(DashboardStatsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // État de chargement
  isLoading: boolean = true;
  statsData: DashboardStatsResponseDTO | null = null;

  // 1. Les 5 Cartes KPI Supérieures
  kpiCards: KpiDisplayCard[] = [];

  // 2. Sélecteur de période du graphique d'activité (7j / 30j / 12m)
  selectedPeriod: '7j' | '30j' | '12m' = '7j';
  chartPoints: PointTemporelDTO[] = [];
  tealPathD: string = '';
  tealAreaD: string = '';
  yellowPathD: string = '';
  activeTooltip: ChartTooltipData | null = null;

  // 3. Contenus les plus consultés
  contenusCategories: ContenuCategorieDTO[] = [];

  // 4. Carte interactive du Mali et pôles régionaux
  statistiquesTerritoriales = {
    totalRegions: 16,
    regionsActives: 12,
    tauxActivite: 75.0
  };
  regionsMali: RegionStatDTO[] = [];
  selectedRegion: RegionStatDTO | null = null;
  hoveredRegion: RegionStatDTO | null = null;

  // 5. Tableau de modération « À valider »
  elementsAValider: ElementModerationDTO[] = [];

  // 6. Fil « Activité récente »
  activitesRecentes: ActiviteRecenteDTO[] = [];

  // 7. Actions rapides
  quickActions = [
    { label: 'Ajouter un lieu', icon: 'map-pin', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/lieux-historiques/ajouter' },
    { label: 'Gestion des événements', icon: 'calendar', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/evenements' },
    { label: 'Répertoire partenaires', icon: 'handshake', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/partenaires' },
    { label: 'Demandes à modérer', icon: 'clipboard', iconColor: '#0E8F76', iconBg: '#E6F7F3', route: '/demandes-partenariat' }
  ];

  ngOnInit(): void {
    this.chargerStatistiques();
  }

  /**
   * Charge les données consolidées depuis DashboardStatsService.
   */
  chargerStatistiques(): void {
    this.isLoading = true;
    this.statsService.getDashboardStats().subscribe({
      next: (data) => {
        this.statsData = data;
        this.initialiserKpis(data);
        this.initialiserGraphique(data);
        this.contenusCategories = data.contenusParCategorie || [];
        this.initialiserCarte(data);
        this.elementsAValider = data.aValider || [];
        this.activitesRecentes = data.activiteRecente || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement dashboard stats :', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Construit les 5 cartes KPI supérieures à partir du DTO.
   */
  private initialiserKpis(data: DashboardStatsResponseDTO): void {
    const k = data.kpis;
    this.kpiCards = [
      {
        id: 'contenusPublies',
        label: 'Contenus publiés',
        value: k.contenusPublies.toLocaleString('fr-FR'),
        delta: k.contenusPubliesDelta || '+12% ce mois',
        deltaType: 'positive',
        icon: 'layers',
        iconBg: '#E6F7F3',
        iconColor: '#0E8F76'
      },
      {
        id: 'enAttenteValidation',
        label: 'En attente de validation',
        value: k.enAttenteValidation,
        delta: k.enAttenteValidation > 0 ? (k.enAttenteValidationDelta || 'À traiter') : 'À jour',
        deltaType: k.enAttenteValidation > 0 ? 'warning' : 'neutral',
        icon: 'clock',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        isAlert: k.enAttenteValidation > 0
      },
      {
        id: 'utilisateursActifs',
        label: 'Utilisateurs actifs',
        value: k.utilisateursActifs >= 1000 ? k.utilisateursActifs.toLocaleString('fr-FR') : k.utilisateursActifs,
        delta: k.utilisateursActifsDelta || '+8%',
        deltaType: 'positive',
        icon: 'users',
        iconBg: '#E0F2FE',
        iconColor: '#0284C7'
      },
      {
        id: 'partenaires',
        label: 'Partenaires',
        value: k.partenaires,
        delta: k.partenairesDelta || 'Professionnels',
        deltaType: 'positive',
        icon: 'handshake',
        iconBg: '#E8F5E9',
        iconColor: '#10B981'
      },
      {
        id: 'evenementsAVenir',
        label: 'Événements à venir',
        value: k.evenementsAVenir,
        delta: k.evenementsAVenirDelta || 'Programmés',
        deltaType: 'neutral',
        icon: 'calendar',
        iconBg: '#FFE4E6',
        iconColor: '#E11D48'
      }
    ];
  }

  /**
   * Initialise et calcule la géométrie SVG pour le graphique d'activité.
   */
  private initialiserGraphique(data: DashboardStatsResponseDTO): void {
    this.changerPeriode(this.selectedPeriod);
  }

  /**
   * Bascule entre 7 jours, 30 jours et 12 mois et recalcule les courbes SVG.
   */
  changerPeriode(period: '7j' | '30j' | '12m'): void {
    this.selectedPeriod = period;
    this.activeTooltip = null;

    if (!this.statsData?.seriesTemporelles) return;

    let rawPoints: PointTemporelDTO[] = [];
    if (period === '7j') {
      rawPoints = this.statsData.seriesTemporelles['7j'] || this.statsData.seriesTemporelles.septJours || [];
    } else if (period === '30j') {
      rawPoints = this.statsData.seriesTemporelles['30j'] || this.statsData.seriesTemporelles.trenteJours || [];
    } else {
      rawPoints = this.statsData.seriesTemporelles['12m'] || this.statsData.seriesTemporelles.douzeMois || [];
    }

    if (rawPoints.length === 0) {
      this.chartPoints = [];
      this.tealPathD = '';
      this.tealAreaD = '';
      this.yellowPathD = '';
      return;
    }

    // Canevas SVG viewBox: 0 0 600 240
    const svgWidth = 600;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 35;
    const paddingBottom = 45;
    const chartHeight = 240 - paddingTop - paddingBottom;
    const chartWidth = svgWidth - paddingLeft - paddingRight;

    // Calcul du maximum pour l'échelle Y
    let maxVal = Math.max(
      ...rawPoints.map((p) => Math.max(p.pagesVues || p.valeur || 1, p.visiteurs || 1))
    );
    if (maxVal <= 0) maxVal = 100;
    maxVal = Math.ceil(maxVal * 1.15); // marge supérieure 15%

    // Calcul des coordonnées X et Y de chaque point
    const stepX = chartWidth / (rawPoints.length > 1 ? rawPoints.length - 1 : 1);

    this.chartPoints = rawPoints.map((p, idx) => {
      const x = Math.round(paddingLeft + idx * stepX);
      const vVisitors = p.visiteurs || Math.round((p.valeur || 10) * 0.4);
      const vPages = p.pagesVues || p.valeur || Math.round(vVisitors * 2.2);

      const yVisiteurs = Math.round(paddingTop + chartHeight - (vVisitors / maxVal) * chartHeight);
      const yPagesVues = Math.round(paddingTop + chartHeight - (vPages / maxVal) * chartHeight);

      return {
        ...p,
        visiteurs: vVisitors,
        pagesVues: vPages,
        x,
        yVisiteurs,
        yPagesVues
      };
    });

    // Génération des chemins spline lissés
    this.tealPathD = this.genererCourbeSpline(this.chartPoints.map((p) => ({ x: p.x!, y: p.yVisiteurs! })));
    this.yellowPathD = this.genererCourbeSpline(this.chartPoints.map((p) => ({ x: p.x!, y: p.yPagesVues! })));

    // Aire sous la courbe Teal
    if (this.chartPoints.length > 0) {
      const firstX = this.chartPoints[0].x!;
      const lastX = this.chartPoints[this.chartPoints.length - 1].x!;
      const baseY = paddingTop + chartHeight;
      this.tealAreaD = `${this.tealPathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    }
  }

  /**
   * Algorithme de génération de courbe de Bézier cubique lissée.
   */
  private genererCourbeSpline(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      // Points de contrôle de Catmull-Rom
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${Math.round(cp1x)} ${Math.round(cp1y)}, ${Math.round(cp2x)} ${Math.round(cp2y)}, ${p2.x} ${p2.y}`;
    }

    return path;
  }

  /**
   * Gestion de l'info-bulle (tooltip) au survol des points du graphique.
   */
  onPointHover(pt: PointTemporelDTO): void {
    this.activeTooltip = {
      label: pt.label,
      date: pt.date || pt.label,
      visiteurs: pt.visiteurs,
      pagesVues: pt.pagesVues,
      valeur: pt.valeur,
      x: pt.x || 300,
      yVisiteurs: pt.yVisiteurs || 120,
      yPagesVues: pt.yPagesVues || 90
    };
  }

  onPointLeave(): void {
    this.activeTooltip = null;
  }

  /**
   * Initialise la carte vectorielle SVG et les 16 pôles régionaux.
   */
  private initialiserCarte(data: DashboardStatsResponseDTO): void {
    const terr = data.statistiquesRegionales;
    if (terr) {
      this.statistiquesTerritoriales = {
        totalRegions: terr.totalRegions || 16,
        regionsActives: terr.regionsActives || (terr.regions ? terr.regions.filter((r) => r.actif).length : 0),
        tauxActivite: terr.tauxActivite || 0
      };
      this.regionsMali = terr.regions || [];
    }

    // Sélectionner par défaut le District de Bamako ou la première région active
    if (this.regionsMali.length > 0) {
      const bko = this.regionsMali.find((r) => r.code === 'BKO');
      this.selectedRegion = bko || this.regionsMali[0];
    }
  }

  /**
   * Sélection d'un pôle régional au clic.
   */
  selectRegion(r: RegionStatDTO): void {
    this.selectedRegion = r;
  }

  /**
   * Survol d'un pôle régional.
   */
  hoverRegion(r: RegionStatDTO): void {
    this.hoveredRegion = r;
  }

  leaveRegion(): void {
    this.hoveredRegion = null;
  }

  /**
   * Redirection vers la page d'action d'une fiche à valider.
   */
  examinerFiche(item: ElementModerationDTO): void {
    if (item.urlAction) {
      this.router.navigateByUrl(item.urlAction);
    } else if (item.type?.toLowerCase().includes('événement')) {
      this.router.navigate(['/validation-evenement', item.id]);
    } else {
      this.router.navigate(['/demandes-partenariat']);
    }
  }

  handleQuickAction(route: string): void {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
