export interface User {
  id?: number | string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  adresse?: string;
  motDePasse?: string;
  role?: 'Touriste' | 'Promoteur' | 'Guide' | string;
  avatar?: string;
  photoUrl?: string;
  pieceIdentite?: string;
  // Champs spécifiques aux Promoteurs
  nomOrganisation?: string;
  adresseOrganisation?: string;
  piecesJustificatifs?: string;
  photoPieceOrganisation?: string;
  nomEvenement?: string;
  dateEvenement?: string;
  descriptionEvenement?: string;
  photosEvenement?: string[];
  // Champs spécifiques aux Guides
  langues?: string;
  experience?: number;
  description?: string;
  statutModeration?: 'VALIDE' | 'EN_ATTENTE' | 'EN_ATTENTE_VALIDATION' | 'REJETE' | string;
  statut?: 'ACTIF' | 'BLOQUE' | 'EN_ATTENTE' | string;
  points?: number;
  dateInscription?: string;
}
