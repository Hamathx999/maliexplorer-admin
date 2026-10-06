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

  // Propriétés du backend Spring Boot
  idLieu?: number;
  nomLieuHisto?: string;
  cordonnees?: string;
  latitude?: number;
  longitude?: number;
  panorama360Url?: string;
  villeId?: number;
}

export interface LieuHistoriqueRequestDTO {
  nomLieuHisto: string;
  description?: string;
  epoque?: string;
  cordonnees?: string;
  latitude?: number;
  longitude?: number;
  panorama360Url?: string;
  villeId?: number;
}

export interface LieuHistoriqueResponseDTO {
  idLieu: number;
  nomLieuHisto: string;
  description?: string;
  epoque?: string;
  cordonnees?: string;
  latitude?: number;
  longitude?: number;
  panorama360Url?: string;
  ville?: {
    id: number;
    nom: string;
    cordonnees?: string;
  };
}
