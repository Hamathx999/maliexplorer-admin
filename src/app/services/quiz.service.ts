import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Quiz } from '../models/quiz.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/quiz`;

  private fallbackQuizList: Quiz[] = [
    {
      id: 1,
      nomQuiz: 'Quiz Culture Malienne',
      points: '50 pts',
      description: 'Testez vos connaissances sur la culture du Mali'
    },
    {
      id: 2,
      nomQuiz: 'Quiz Histoire du Mali',
      points: '40 pts',
      description: 'Découvrez l\'histoire de l\'Empire du Mali'
    },
    {
      id: 3,
      nomQuiz: 'Quiz Géographie',
      points: '30 pts',
      description: 'Les villes et régions du Mali'
    },
    {
      id: 4,
      nomQuiz: 'Quiz Gastronomie',
      points: '25 pts',
      description: 'Les plats traditionnels maliens'
    },
    {
      id: 5,
      nomQuiz: 'Quiz Musique Malienne',
      points: '35 pts',
      description: 'Les artistes et instruments maliens'
    },
    {
      id: 6,
      nomQuiz: 'Quiz Monuments',
      points: '45 pts',
      description: 'Les lieux historiques du Mali'
    },
    {
      id: 7,
      nomQuiz: 'Quiz Ethnies du Mali',
      points: '30 pts',
      description: 'Les peuples et traditions du Mali'
    },
    {
      id: 8,
      nomQuiz: 'Quiz Faune et Flore',
      points: '20 pts',
      description: 'La biodiversité malienne'
    }
  ];

  getQuizList(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les quiz, utilisation du cache local :', error);
        return of(this.fallbackQuizList);
      })
    );
  }

  getQuizById(id: number | string): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.fallbackQuizList.find((q) => q.id === id);
        return of(found ?? { id, nomQuiz: 'Quiz', points: '50 pts' });
      })
    );
  }

  createQuiz(quiz: Quiz): Observable<Quiz> {
    return this.http.post<Quiz>(this.apiUrl, quiz).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du quiz :', error);
        const newQuiz: Quiz = {
          ...quiz,
          id: Date.now(),
          points: typeof quiz.points === 'number' ? `${quiz.points} pts` : quiz.points
        };
        this.fallbackQuizList.unshift(newQuiz);
        return of(newQuiz);
      })
    );
  }

  updateQuiz(id: number | string, quiz: Quiz): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/${id}`, quiz).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du quiz :', error);
        const index = this.fallbackQuizList.findIndex((q) => q.id === id);
        if (index !== -1) {
          this.fallbackQuizList[index] = { ...this.fallbackQuizList[index], ...quiz, id };
        }
        return of({ ...quiz, id });
      })
    );
  }

  deleteQuiz(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du quiz :', error);
        this.fallbackQuizList = this.fallbackQuizList.filter((q) => q.id !== id);
        return of(void 0);
      })
    );
  }
}
