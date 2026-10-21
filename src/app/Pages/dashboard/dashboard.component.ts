import { Component, OnInit, AfterViewInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly statsService = inject(DashboardStatsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  private leafletMap: any = null;

  // État de chargement
  isLoading: boolean = true;
  statsData: DashboardStatsResponseDTO | null = null;

  // Mode de carte ('osm' = vraie carte géographique OpenStreetMap, 'svg' = vue vectorielle)
  modeCarte: 'osm' | 'svg' = 'osm';

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

  // Tracé haute fidélité officiel des frontières de la République du Mali (WGS84 projeté)
  readonly maliBoundaryD: string = 'M 274.6 35.5 L 300.0 35.5 L 306.4 41.1 L 331.8 77.0 L 379.4 118.4 L 411.2 146.1 L 458.8 173.7 L 506.5 187.5 L 562.1 197.2 L 554.1 228.9 L 538.2 256.6 L 516.0 270.4 L 506.5 289.7 L 484.2 306.3 L 452.5 313.2 L 433.4 311.8 L 422.3 317.4 L 401.6 331.2 L 369.9 336.7 L 338.1 347.8 L 315.9 372.6 L 284.1 394.7 L 268.2 433.4 L 252.4 444.5 L 230.1 443.1 L 204.7 436.2 L 179.3 427.9 L 166.6 408.6 L 153.9 392.0 L 134.8 389.2 L 103.1 386.4 L 71.3 383.7 L 52.2 378.2 L 39.5 353.3 L 39.5 318.8 L 45.9 306.3 L 77.6 298.0 L 125.3 295.3 L 157.1 292.5 L 188.8 298.0 L 236.5 289.7 L 252.4 270.4 L 252.4 173.7 L 268.2 90.8 Z';

  // Tracé officiel du Fleuve Niger (Djoliba) traversant le Mali
  readonly fleuveNigerD: string = 'M 166.6 397.5 Q 170 387 172.9 376.8 T 187.2 371.0 T 228.2 355.2 T 234.2 347.8 T 268.2 333.9 T 294.3 325.9 T 296.8 303.6 T 300.6 286.1 T 319.7 276.8 T 331.8 262.9 T 360.4 259.3 T 382.6 255.7 T 415.9 258.0 T 428.6 276.8 T 442.9 293.6 T 450.9 312.4';

  // Contrôles de zoom et vue sur la carte
  mapZoom: number = 1;
  mapViewBox: string = '0 0 600 480';

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
        if (this.modeCarte === 'osm' && isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.initialiserLeafletMap(), 200);
        }
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
    const chartHeight = 150; // Aligne parfaitement les points à 0 sur l'axe horizontal SVG (y = 35 + 150 = 185)
    const chartWidth = svgWidth - paddingLeft - paddingRight;

    // Calcul du maximum pour l'échelle Y
    let maxVal = Math.max(
      ...rawPoints.map((p) => Math.max(p.pagesVues ?? p.valeur ?? 0, p.visiteurs ?? 0))
    );
    if (maxVal <= 0) maxVal = 10;
    maxVal = Math.ceil(maxVal * 1.15); // marge supérieure 15%

    // Calcul des coordonnées X et Y de chaque point
    const stepX = chartWidth / (rawPoints.length > 1 ? rawPoints.length - 1 : 1);

    this.chartPoints = rawPoints.map((p, idx) => {
      const x = Math.round(paddingLeft + idx * stepX);
      const vVisitors = p.visiteurs ?? p.valeur ?? 0;
      const vPages = p.pagesVues ?? (vVisitors > 0 ? vVisitors * 3 : 0);

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

  zoomIn(): void {
    if (this.mapZoom < 2.4) {
      this.mapZoom = Math.round((this.mapZoom + 0.3) * 10) / 10;
      this.actualiserViewBox();
    }
  }

  zoomOut(): void {
    if (this.mapZoom > 0.8) {
      this.mapZoom = Math.round((this.mapZoom - 0.3) * 10) / 10;
      this.actualiserViewBox();
    }
  }

  resetZoom(): void {
    this.mapZoom = 1;
    this.mapViewBox = '0 0 600 480';
  }

  private actualiserViewBox(): void {
    const w = Math.round(600 / this.mapZoom);
    const h = Math.round(480 / this.mapZoom);
    const cx = this.selectedRegion?.x ?? 300;
    const cy = this.selectedRegion?.y ?? 240;
    const x = Math.max(0, Math.min(600 - w, Math.round(cx - w / 2)));
    const y = Math.max(0, Math.min(480 - h, Math.round(cy - h / 2)));
    this.mapViewBox = `${x} ${y} ${w} ${h}`;
  }

  ouvrirCarteGps(region?: RegionStatDTO | null): void {
    if (typeof window === 'undefined') return;
    const reg = region || this.selectedRegion;
    const query = reg ? `${reg.chefLieu}, ${reg.nom}, Mali` : 'République du Mali';
    const url = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initialiserLeafletMap(), 250);
    }
  }

  ngOnDestroy(): void {
    if (this.leafletMap) {
      try {
        this.leafletMap.remove();
      } catch {}
      this.leafletMap = null;
    }
  }

  changerModeCarte(mode: 'osm' | 'svg'): void {
    this.modeCarte = mode;
    this.cdr.markForCheck();
    if (mode === 'osm' && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        if (!this.leafletMap) {
          this.initialiserLeafletMap();
        } else {
          this.leafletMap.invalidateSize();
        }
      }, 150);
    }
  }

  async initialiserLeafletMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const mapContainer = document.getElementById('mali-leaflet-map');
    if (!mapContainer) return;

    if (this.leafletMap) {
      try {
        this.leafletMap.remove();
      } catch {}
      this.leafletMap = null;
    }

    try {
      const L = await import('leaflet');

      this.leafletMap = L.map('mali-leaflet-map', {
        center: [16.5, -3.5], // Centre géographique de la République du Mali
        zoom: 5,
        minZoom: 4,
        maxZoom: 14,
        scrollWheelZoom: true
      });

      // Fond de carte OpenStreetMap officiel haute résolution
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors • République du Mali'
      }).addTo(this.leafletMap);

      // Tracé royal du Fleuve Niger (Djoliba)
      const nigerCoords: [number, number][] = [
        [11.90, -8.20],
        [12.65, -8.00],
        [12.86, -7.55],
        [13.43, -6.26],
        [13.70, -6.07],
        [14.20, -5.00],
        [14.49, -4.18],
        [15.30, -4.10],
        [15.93, -3.98],
        [16.27, -3.38],
        [16.77, -3.00],
        [16.90, -2.10],
        [17.03, -1.40],
        [16.95, -0.35],
        [16.27, 0.05],
        [15.66, 0.50],
        [14.98, 0.75]
      ];

      L.polyline(nigerCoords, {
        color: '#0288D1',
        weight: 4.5,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup('<b style="color:#0288D1; font-size:13px;">Fleuve Niger (Djoliba)</b><br>Artère fluviale et historique du Mali').addTo(this.leafletMap);

      // Marqueurs interactifs pour chaque pôle régional
      for (const reg of this.regionsMali) {
        const lat = reg.lat ?? 12.65;
        const lng = reg.lng ?? -8.00;

        const marker = L.circleMarker([lat, lng], {
          radius: reg.actif ? 8.5 : 6,
          fillColor: reg.actif ? '#0E8F76' : '#94A3B8',
          color: '#FFFFFF',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(this.leafletMap);

        const statusBadge = reg.actif
          ? '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10.5px;font-weight:700;background:#DCFCE7;color:#15803D;">● Région Active</span>'
          : '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10.5px;font-weight:700;background:#F1F5F9;color:#64748B;">○ En développement</span>';

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
            <strong style="color: #075E4D; font-size: 14px;">${reg.nom}</strong><br>
            <span style="color: #64748B;">Chef-lieu : <b>${reg.chefLieu}</b></span><br>
            <div style="margin: 4px 0;">${statusBadge}</div>
            <div style="margin-top: 6px; border-top: 1px solid #E2E8F0; padding-top: 4px;">
              Entités culturelles : <b>${reg.totalEntites}</b><br>
              Lieux historiques : <b>${reg.nombreLieux ?? 0}</b> • Villes : <b>${reg.nombreVilles ?? 0}</b>
            </div>
          </div>
        `);

        marker.on('click', () => {
          this.selectRegion(reg);
          this.cdr.markForCheck();
        });
      }

      setTimeout(() => this.leafletMap?.invalidateSize(), 300);
    } catch (err) {
      console.warn('Initialisation Leaflet reportée :', err);
    }
  }

  handleQuickAction(route: string): void {
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
