/**
 * Modèle pour un élément du lexique usuel d'une langue nationale.
 */
export interface LexiqueItem {
  mot: string;
  phonetique: string;
  traduction: string;
  categorie: string;
}

/**
 * Modèle pour une langue nationale du Mali (ex: Bamanankan, Fulfulde, Songhaï, etc.).
 */
export interface LangueNationale {
  id?: number | string;
  nom: string;
  nomLocal?: string;
  locuteurs: string;
  regions: string;
  description: string;
  imageUrl?: string;
  ordreAffichage?: number;
  ordre?: number;
  estPublie?: boolean;
  publie?: boolean;
  lexiqueJson?: string;
  lexique?: LexiqueItem[];
  dateCreation?: string;
  dateModification?: string;
}

