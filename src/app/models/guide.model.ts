export type StatutModeration = 'VALIDE' | 'EN_ATTENTE' | 'EN_ATTENTE_VALIDATION' | 'REJETE';

export interface GuideRequestDTO {
  prenom: string;
  nom: string;
  email: string;
  motDePasse?: string;
  adresse?: string;
  photoUrl?: string;
  experience?: number;
  description?: string;
  langue: string;
  pieceIdentite?: string;
  idAdministrateur?: number;
}

export interface GuideResponseDTO {
  idUsers: number;
  firebaseUid?: string;
  prenom: string;
  nom: string;
  email: string;
  adresse?: string;
  photoUrl?: string;
  dateCreation?: string | Date;
  role?: string;
  idGuide?: number;
  experience?: number;
  description?: string;
  langue: string;
  pieceIdentite?: string;
  idAdministrateur?: number;
  recherchePartenariat?: boolean;
  titreProjet?: string;
  besoinPartenariat?: string;
  statutModeration?: StatutModeration;
}

export interface Guide extends GuideResponseDTO {
  id?: number;
}
