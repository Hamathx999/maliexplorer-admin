/**
 * Modèle pour une fiche d'information pratique pour les voyageurs au Mali.
 * Catégories usuelles : 'VISAS', 'SANTE', 'DEVISES', 'CLIMAT', 'URGENCES'.
 */
export interface InfoPratique {
  id?: number | string;
  titre: string;
  categorie: string; // 'VISAS' | 'SANTE' | 'DEVISES' | 'CLIMAT' | 'URGENCES' | string;
  description?: string;
  conseils?: string;
  coordonnees?: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
  imageUrl?: string;
  ordreAffichage?: number;
  ordre?: number;
  estPublie?: boolean;
  publie?: boolean;
  dateCreation?: string;
  dateModification?: string;
}

