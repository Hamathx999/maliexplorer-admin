export interface Region {
  id?: number | string;
  nom: string;
  chefLieu?: string;
  population?: number | string;
  nbreHbt?: number | string;
  superficie?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  imageUrl?: string;
  nombreSites?: number;
}
