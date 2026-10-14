export interface HomeSlide {
  id?: number;
  titre: string;
  sousTitre?: string;
  legende?: string;
  imageUrl: string;
  lienAction?: string;
  ordre: number;
  estActif: boolean;
  estPrincipal: boolean;
  dateCreation?: string;
}

