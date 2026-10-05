export interface Question {
  id?: number | string;
  theme: string;
  question: string;
  reponse: string;
  duree: string;
  options?: string[];
  quizId?: number | string;
  explication?: string;
}
