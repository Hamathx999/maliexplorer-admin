import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Question } from '../models/question.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/questions`;

  private readonly STORAGE_KEY = 'maliexplorer_questions_custom';

  private getLocalQuestions(): Question[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage questions', e);
    }
    return [];
  }

  private saveLocalQuestions(questions: Question[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(questions));
    } catch (e) {
      console.warn('Erreur écriture localStorage questions', e);
    }
  }

  /**
   * Normalise un objet Question provenant du backend Spring Boot
   */
  private mapQuestion(q: Question): Question {
    const rawOpts = q.propositions && q.propositions.length > 0
      ? q.propositions
      : (q.options && q.options.length > 0 ? q.options : (q.reponse ? [q.reponse] : []));

    return {
      ...q,
      id: q.idQuestion ?? q.id,
      idQuestion: q.idQuestion ?? q.id,
      question: q.nomQuestion || q.question || '',
      nomQuestion: q.nomQuestion || q.question || '',
      reponse: q.reponse || '',
      theme: q.theme || 'Culture générale',
      explication: q.explication || '',
      points: q.points || 10,
      quizId: q.quizId ?? (q as any).quiz?.idQuiz ?? (q as any).quiz?.id ?? undefined,
      duree: typeof q.duree === 'number' ? `${q.duree}s` : (q.duree || '30s'),
      options: rawOpts,
      propositions: rawOpts
    };
  }

  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(this.apiUrl).pipe(
      map((data: Question[]) => (Array.isArray(data) ? data.map((q) => this.mapQuestion(q)) : [])),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les questions :', error);
        return of([]);
      })
    );
  }

  /**
   * Récupère toutes les questions rattachées à un quiz spécifique
   */
  getQuestionsByQuiz(quizId: number | string): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/quiz/${quizId}`).pipe(
      map((data: Question[]) => (Array.isArray(data) ? data.map((q) => this.mapQuestion(q)) : [])),
      catchError((error) => {
        console.warn(`Erreur chargement questions du quiz ${quizId} :`, error);
        return of([]);
      })
    );
  }

  getQuestionById(id: number | string): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/${id}`).pipe(
      map((q: Question) => this.mapQuestion(q)),
      catchError(() => {
        const local = this.getLocalQuestions();
        const found = local.find((q) => String(q.id) === String(id));
        return of(found ?? { id, theme: 'Culture générale', question: '', reponse: '', duree: '30s' });
      })
    );
  }

  private buildPayload(question: Question) {
    const rawDuree = String(question.duree || 30);
    const numericDuree = parseInt(rawDuree.replace(/\D/g, ''), 10) || 30;
    const rawOptions = question.options || question.propositions || [];
    const cleanPropositions = rawOptions.map((o) => (o || '').trim()).filter((o) => o.length > 0);
    const rep = (question.reponse || '').trim();
    if (rep && !cleanPropositions.includes(rep)) {
      cleanPropositions.unshift(rep);
    }

    return {
      nomQuestion: (question.question || question.nomQuestion || '').trim(),
      question: (question.question || question.nomQuestion || '').trim(),
      reponse: rep,
      theme: (question.theme || 'Culture générale').trim(),
      duree: numericDuree,
      points: Number(question.points) || 10,
      explication: (question.explication || '').trim(),
      quizId: question.quizId ? Number(question.quizId) : null,
      propositions: cleanPropositions.length > 0 ? cleanPropositions : [rep]
    };
  }

  createQuestion(question: Question): Observable<Question> {
    const payload = this.buildPayload(question);

    return this.http.post<Question>(this.apiUrl, payload).pipe(
      map((created: Question) => this.mapQuestion(created)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de la question :', error);
        const newQ: Question = this.mapQuestion({
          ...question,
          id: Date.now(),
          duree: `${payload.duree}s`,
          options: payload.propositions,
          propositions: payload.propositions
        });
        const current = this.getLocalQuestions();
        current.unshift(newQ);
        this.saveLocalQuestions(current);
        return of(newQ);
      })
    );
  }

  updateQuestion(id: number | string, question: Question): Observable<Question> {
    const payload = this.buildPayload(question);

    return this.http.put<Question>(`${this.apiUrl}/${id}`, payload).pipe(
      map((updated: Question) => this.mapQuestion(updated)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de la question :', error);
        const current = this.getLocalQuestions();
        const index = current.findIndex((q) => String(q.id) === String(id));
        const fallback = this.mapQuestion({ ...question, id, options: payload.propositions, propositions: payload.propositions });
        if (index !== -1) {
          current[index] = fallback;
          this.saveLocalQuestions(current);
        }
        return of(fallback);
      })
    );
  }

  deleteQuestion(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de la question :', error);
        const current = this.getLocalQuestions().filter((q) => String(q.id) !== String(id));
        this.saveLocalQuestions(current);
        return of(void 0);
      })
    );
  }
}
