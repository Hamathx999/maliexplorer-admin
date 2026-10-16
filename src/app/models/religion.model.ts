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

  // Propriétés de synchronisation Spring Boot
  categorie?: string;
  description?: string;
  histoire?: string;
  pratiques?: string;
  fetes?: string;
  lieuxDeCulte?: string;
  regionsConcernees?: string;
  branches?: string;
  proportionPopulation?: string;
  nombrePratiquantsEstime?: string;
  sourceStatistiques?: string;
  anneeStatistiques?: string;
  ordre?: number;
  publie?: boolean;
}

