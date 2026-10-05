export interface LieuHistorique {
  id?: number | string;
  nom: string;
  epoque: string;
  ville: string;
  region: string;
  coordonneesGps?: string;
  description?: string;
  imageUrl?: string;
  images?: { nom: string; taille: string; url?: string }[];
  classeUnesco?: boolean;
}
