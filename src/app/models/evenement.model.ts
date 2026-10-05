export interface Evenement {
  id?: number | string;
  titre: string;
  nomOrganisateur?: string;
  emailOrganisateur?: string;
  telephoneOrganisateur?: string;
  description: string;
  dateDebut: string;
  dateFin?: string;
  heureDebut?: string;
  heureFin?: string;
  lieu: string;
  ville?: string;
  region?: string;
  categorie?: string;
  statut: 'APPROUVE' | 'EN_ATTENTE' | 'REFUSE' | 'VALIDE';
  prix?: string;
  imageUrl?: string;
  afficheUrl?: string;
  dateSoumission?: string;
  motifRejet?: string;
}
