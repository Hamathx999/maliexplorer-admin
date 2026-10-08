export interface Plat {
  id?: number | string;
  nom: string;
  ingredientPrincipal?: string;
  description?: string;
  region?: string;
  tempsPreparation?: string;
  difficulte?: string;
  imageUrl?: string;
  ingredients?: string[];
  ingredientIds?: number[];
}
