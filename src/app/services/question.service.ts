import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Question } from '../models/question.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/questions`;

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

  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les questions, utilisation du cache local :', error);
        return of(this.fallbackQuestions);
      })
    );
  }

  getQuestionById(id: number | string): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackQuestions.find((q) => q.id === id);
        return of(found ?? { id, theme: 'Culture générale', question: '', reponse: '', duree: '30s' });
      })
    );
  }

  createQuestion(question: Question): Observable<Question> {
    return this.http.post<Question>(this.apiUrl, question).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local de la question :', error);
        const newQ: Question = {
          ...question,
          id: Date.now(),
          duree: question.duree.includes('s') ? question.duree : `${question.duree}s`
        };
        this.fallbackQuestions.unshift(newQ);
        return of(newQ);
      })
    );
  }

  updateQuestion(id: number | string, question: Question): Observable<Question> {
    return this.http.put<Question>(`${this.apiUrl}/${id}`, question).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale de la question :', error);
        const index = this.fallbackQuestions.findIndex((q) => q.id === id);
        if (index !== -1) {
          this.fallbackQuestions[index] = { ...this.fallbackQuestions[index], ...question, id };
        }
        return of({ ...question, id });
      })
    );
  }

  deleteQuestion(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale de la question :', error);
        this.fallbackQuestions = this.fallbackQuestions.filter((q) => q.id !== id);
        return of(void 0);
      })
    );
  }
}
