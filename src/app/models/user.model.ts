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
  // Promoteur fields
  nomOrganisation?: string;
  adresseOrganisation?: string;
  piecesJustificatifs?: string;
  photoPieceOrganisation?: string;
  nomEvenement?: string;
  dateEvenement?: string;
  descriptionEvenement?: string;
  photosEvenement?: string[];
  // Guide fields
  langues?: string;
  experience?: number;
  statut?: 'ACTIF' | 'BLOQUE' | 'EN_ATTENTE' | string;
  points?: number;
  dateInscription?: string;
}
