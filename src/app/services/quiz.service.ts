import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Quiz } from '../models/quiz.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/quiz`;

  private readonly STORAGE_KEY = 'maliexplorer_quiz_custom';

  private fallbackQuizList: Quiz[] = [
    {
      id: 1,
      nomQuiz: 'Quiz Culture Malienne',
      points: 50,
      description: 'Testez vos connaissances sur les traditions et les valeurs du Mali.'
    },
    {
      id: 2,
      nomQuiz: 'Quiz Histoire du Mali',
      points: 40,
      description: "Découvrez les épopées médiévales et la charte de Kouroukan Fouga."
    },
    {
      id: 3,
      nomQuiz: 'Quiz Géographie Sahélienne',
      points: 30,
      description: 'Les fleuves, falaises, déserts et grandes cités du Mali.'
    },
    {
      id: 4,
      nomQuiz: 'Quiz Gastronomie Malienne',
      points: 25,
      description: 'Les ingrédients emblématiques et les recettes ancestrales.'
    },
    {
      id: 5,
      nomQuiz: 'Quiz Musique & Instruments',
      points: 35,
      description: 'La kora, le balafon, le ngoni et les grands maîtres de la musique.'
    },
    {
      id: 6,
      nomQuiz: 'Quiz Monuments & Patrimoine',
      points: 45,
      description: 'Les mosquées en terre de Djenné, les tombeaux et manuscrits de Tombouctou.'
    },
    {
      id: 7,
      nomQuiz: 'Quiz Ethnies & Coutumes',
      points: 30,
      description: 'Le cousinage à plaisanterie (Sinankunya) et la richesse des peuples.'
    },
    {
      id: 8,
      nomQuiz: 'Quiz Faune & Flore du Mali',
      points: 20,
      description: 'Les éléphants du Gourma, les baobabs géants et la biodiversité.'
    }
  ];

  private getLocalQuizList(): Quiz[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage quiz', e);
    }
    return [...this.fallbackQuizList];
  }

  private saveLocalQuizList(list: Quiz[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erreur écriture localStorage quiz', e);
    }
  }

  private mapQuiz(dto: any): Quiz {
    let pts = 50;
    if (typeof dto.points === 'number') pts = dto.points;
    else if (typeof dto.point === 'number') pts = dto.point;
    else if (dto.points) pts = parseInt(String(dto.points).replace(/\D/g, ''), 10) || 50;
    else if (dto.point) pts = parseInt(String(dto.point).replace(/\D/g, ''), 10) || 50;

    return {
      id: dto.id ?? dto.idQuiz,
      nomQuiz: dto.nomQuiz ?? dto.titre ?? dto.nom ?? 'Quiz Malien',
      points: pts,
      description: dto.description || '',
      categorie: dto.categorie || 'Culture & Histoire',
      nombreQuestions: dto.questions ? dto.questions.length : (dto.nombreQuestions || 5),
      imageUrl: dto.imageQuiz || dto.imageUrl || ''
    };
  }

  getQuizList(): Observable<Quiz[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non disponible pour les quiz, utilisation du stockage local :', error);
        return of(this.getLocalQuizList());
      })
    );
  }

  getQuiz(): Observable<Quiz[]> {
    return this.getQuizList();
  }

  getQuizById(id: number | string): Observable<Quiz> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const local = this.getLocalQuizList();
        const found = local.find((q) => String(q.id) === String(id));
        return of(found ? this.mapQuiz(found) : { id, nomQuiz: 'Quiz', points: 50 });
      })
    );
  }

  createQuiz(quiz: Quiz): Observable<Quiz> {
    const pts = typeof quiz.points === 'number' ? quiz.points : (parseInt(String(quiz.points).replace(/\D/g, ''), 10) || 50);
    const payload = {
      nomQuiz: quiz.nomQuiz,
      description: quiz.description,
      categorie: quiz.categorie || 'Culture & Histoire',
      point: pts,
      points: pts,
      imageQuiz: quiz.imageUrl || '',
      imageUrl: quiz.imageUrl || ''
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((res) => this.mapQuiz(res)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, enregistrement local du quiz :', error);
        const newQuiz: Quiz = {
          ...quiz,
          id: Date.now(),
          points: pts
        };
        const current = this.getLocalQuizList();
        current.unshift(newQuiz);
        this.saveLocalQuizList(current);
        return of(newQuiz);
      })
    );
  }

  updateQuiz(id: number | string, quiz: Quiz): Observable<Quiz> {
    const pts = typeof quiz.points === 'number' ? quiz.points : (parseInt(String(quiz.points).replace(/\D/g, ''), 10) || 50);
    const payload = {
      nomQuiz: quiz.nomQuiz,
      description: quiz.description,
      categorie: quiz.categorie || 'Culture & Histoire',
      point: pts,
      points: pts,
      imageQuiz: quiz.imageUrl || '',
      imageUrl: quiz.imageUrl || ''
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map((res) => this.mapQuiz(res)),
      catchError((error) => {
        console.warn('API Spring Boot non joignable, mise à jour locale du quiz :', error);
        const current = this.getLocalQuizList();
        const index = current.findIndex((q) => String(q.id) === String(id));
        if (index !== -1) {
          current[index] = { ...current[index], ...quiz, id, points: pts };
          this.saveLocalQuizList(current);
        }
        return of({ ...quiz, id, points: pts });
      })
    );
  }

  deleteQuiz(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.warn('API Spring Boot non joignable, suppression locale du quiz :', error);
        const current = this.getLocalQuizList().filter((q) => String(q.id) !== String(id));
        this.saveLocalQuizList(current);
        return of(void 0);
      })
    );
  }
}
