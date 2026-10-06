export interface Question {
  id?: number | string;
  idQuestion?: number | string;
  nomQuestion?: string;
  question: string;
  reponse: string;
  theme?: string;
  duree: number | string;
  points?: number;
  options?: string[];
  propositions?: string[];
  quizId?: number | string;
  explication?: string;
}
