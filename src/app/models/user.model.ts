export interface User {
  id?: number | string;
  nom: string;
  prenom?: string;
  email: string;
  role?: string;
  avatar?: string;
  photoUrl?: string;
  statut?: 'ACTIF' | 'BLOQUE' | 'EN_ATTENTE' | string;
  points?: number;
  dateInscription?: string;
}
