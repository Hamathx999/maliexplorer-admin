export interface Ville {
  id?: number | string;
  nom: string;
  region: string;
  regionId?: number | string;
  population?: number | string;
  description?: string;
  superficie?: string;
  cordonnees?: string;
  imageUrl?: string;
  images?: string[];
  misEnAvantHome?: boolean;
  ordreHome?: number;
  legende?: string;
}
