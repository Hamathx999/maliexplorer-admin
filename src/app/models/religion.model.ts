export interface Religion {
  id?: number;
  nom: string;
  pourcentageEstime: number;
  sourceStatistique?: string;
  anneeStatistique?: number;
  descriptionHistorique: string;
  courantsOuBranches?: string[];
  pratiquesEtFetes?: string;
  lieuxEmblematiques?: string;
  imageUrl?: string;
  ordreAffichage: number;
  estPublie: boolean;
}

