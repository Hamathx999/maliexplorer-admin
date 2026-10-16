/**
 * Modèle TypeScript pour la gestion des partenaires et des demandes de partenariat.
 * Conforme au DTO OpportuniteResponseDTO et aux modèles Spring Boot du backend.
 */

export interface OpportuniteResponseDTO {
  idUsers: number;
  nomComplet: string;
  email: string;
  adresse?: string;
  photoUrl?: string;
  role?: string;
  typePartenaire?: string; // "PROMOTEUR", "GUIDE", "INVESTISSEUR"
  specialiteOuOrganisation?: string;
  recherchePartenariat?: boolean;
  titreProjet?: string;
  besoinPartenariat?: string;
  statutModeration?: 'EN_ATTENTE_VALIDATION' | 'VALIDE' | 'REJETE' | string;
  motifRejet?: string;
  dateCreation?: string;
}

export interface PartenaireItem {
  id: number;
  nomComplet: string;
  email: string;
  telephone?: string;
  adresse?: string;
  photoUrl?: string;
  role: 'Promoteur' | 'Guide' | 'Investisseur' | 'Partenaire';
  roleCode?: string;
  organisation?: string;
  specialite?: string;
  statutCompte: 'ACTIF' | 'BLOQUE';
  statutModeration?: string;
  recherchePartenariat: boolean;
  titreProjet?: string;
  besoinPartenariat?: string;
  dateCreation?: string;
  pieceIdentite?: string;
  piecesJustificatifs?: string;
  description?: string;
}
