export interface Administrateur {
  idUsers?: number;
  firebaseUid?: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  photoUrl?: string;
  motDePasse?: string;
  role: 'admin' | 'superAdmin';
  statut?: 'ACTIF' | 'BLOQUE' | string;
  dateCreation?: string;
}

