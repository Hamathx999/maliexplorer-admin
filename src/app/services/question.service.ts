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

  private fallbackQuestions: Question[] = [
    {
      id: 1,
      theme: 'Culture générale',
      question: 'Quel est la capitale du Mali ?',
      reponse: 'Bamako',
      duree: '30s'
    },
    {
      id: 2,
      theme: 'Histoire',
      question: 'Qui a fondé l\'Empire du Mali ?',
      reponse: 'Soundiata Keïta',
      duree: '45s'
    },
    {
      id: 3,
      theme: 'Géographie',
      question: 'Quel est le plus long fleuve du Mali ?',
      reponse: 'Le Niger',
      duree: '30s'
    },
    {
      id: 4,
      theme: 'Monuments',
      question: 'Dans quelle ville se trouve la Grande Mosquée ?',
      reponse: 'Djenné',
      duree: '30s'
    },
    {
      id: 5,
      theme: 'Musique',
      question: 'Quel instrument est typique du Mali ?',
      reponse: 'La kora',
      duree: '45s'
    },
    {
      id: 6,
      theme: 'Gastronomie',
      question: 'Quel est le plat national du Mali ?',
      reponse: 'Le tô',
      duree: '30s'
    },
    {
      id: 7,
      theme: 'Ethnies',
      question: 'Quel peuple vit dans les falaises de Bandiagara ?',
      reponse: 'Les Dogons',
      duree: '45s'
    },
    {
      id: 8,
      theme: 'Histoire',
      question: 'En quelle année le Mali est-il devenu indépendant ?',
      reponse: '1960',
      duree: '30s'
    }
  ];

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
    return [...this.fallbackQuestions];
  }

  private saveLocalQuestions(questions: Question[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(questions));
    } catch (e) {
      console.warn('Erreur écriture localStorage questions', e);
    }
  }

  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(this.apiUrl).pipe(
      map((data: Question[]) =>
        data.map((q) => ({
          ...q,
          id: q.idQuestion ?? q.id,
          idQuestion: q.idQuestion ?? q.id,
          question: q.nomQuestion || q.question || '',
          nomQuestion: q.nomQuestion || q.question || '',
          reponse: q.reponse || '',
          theme: q.theme || 'Culture générale',
          duree: typeof q.duree === 'number' ? `${q.duree}s` : (q.duree || '30s')
        }))
      ),
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les questions, utilisation du stockage local :', error);
        return of(this.getLocalQuestions());
      })
    );
  }

  getQuestionById(id: number | string): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/${id}`).pipe(
      map((q: Question) => ({
        ...q,
        id: q.idQuestion ?? q.id,
        idQuestion: q.idQuestion ?? q.id,
        question: q.nomQuestion || q.question || '',
        nomQuestion: q.nomQuestion || q.question || '',
        reponse: q.reponse || '',
        theme: q.theme || 'Culture générale',
        duree: typeof q.duree === 'number' ? `${q.duree}s` : (q.duree || '30s')
      })),
      catchError(() => {
        const local = this.getLocalQuestions();
        const found = local.find((q) => String(q.id) === String(id));
        return of(found ?? { id, theme: 'Culture générale', question: '', reponse: '', duree: '30s' });
      })
    );
  }

  createQuestion(question: Question): Observable<Question> {
    const rawDuree = String(question.duree || 30);
    const numericDuree = parseInt(rawDuree.replace(/\D/g, ''), 10) || 30;

    const payload = {
      nomQuestion: question.question || question.nomQuestion,
      question: question.question || question.nomQuestion,
      reponse: question.reponse,
      theme: question.theme || 'Culture générale',
      duree: numericDuree,
      points: question.points || 10,
      quizId: question.quizId ? Number(question.quizId) : null,
      propositions: question.options && question.options.length > 0 ? question.options : [question.reponse]
    };

    return this.http.post<Question>(this.apiUrl, payload).pipe(
      map((created: Question) => ({
        ...created,
        id: created.idQuestion ?? created.id,
        idQuestion: created.idQuestion ?? created.id,
        question: created.nomQuestion || created.question || '',
        nomQuestion: created.nomQuestion || created.question || '',
        reponse: created.reponse || question.reponse,
        theme: created.theme || question.theme || 'Culture générale',
        duree: typeof created.duree === 'number' ? `${created.duree}s` : (created.duree || `${numericDuree}s`)
      })),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de la question :', error);
        const newQ: Question = {
          ...question,
          id: Date.now(),
          duree: `${numericDuree}s`
        };
        const current = this.getLocalQuestions();
        current.unshift(newQ);
        this.saveLocalQuestions(current);
        return of(newQ);
      })
    );
  }

  updateQuestion(id: number | string, question: Question): Observable<Question> {
    const rawDuree = String(question.duree || 30);
    const numericDuree = parseInt(rawDuree.replace(/\D/g, ''), 10) || 30;

    const payload = {
      nomQuestion: question.question || question.nomQuestion,
      question: question.question || question.nomQuestion,
      reponse: question.reponse,
      theme: question.theme || 'Culture générale',
      duree: numericDuree,
      points: question.points || 10,
      quizId: question.quizId ? Number(question.quizId) : null,
      propositions: question.options && question.options.length > 0 ? question.options : [question.reponse]
    };

    return this.http.put<Question>(`${this.apiUrl}/${id}`, payload).pipe(
      map((updated: Question) => ({
        ...updated,
        id: updated.idQuestion ?? updated.id,
        idQuestion: updated.idQuestion ?? updated.id,
        question: updated.nomQuestion || updated.question || '',
        nomQuestion: updated.nomQuestion || updated.question || '',
        reponse: updated.reponse || question.reponse,
        theme: updated.theme || question.theme || 'Culture générale',
        duree: typeof updated.duree === 'number' ? `${updated.duree}s` : (updated.duree || `${numericDuree}s`)
      })),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de la question :', error);
        const current = this.getLocalQuestions();
        const index = current.findIndex((q) => String(q.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...question, id };
          this.saveLocalQuestions(current);
        }
        return of({ ...question, id });
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
