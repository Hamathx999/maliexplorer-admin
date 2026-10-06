import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { QuizService } from '../../services/quiz.service';
import { Quiz } from '../../models/quiz.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  quizList: Quiz[] = [];
  filteredQuiz: Quiz[] = [];
  searchTerm: string = '';

  isEditing: boolean = false;
  editingQuiz: Quiz | null = null;
  formData: Partial<Quiz> = {
    nomQuiz: '',
    points: 50,
    description: '',
    categorie: 'Histoire & Empires',
    nombreQuestions: 5
  };

  ngOnInit(): void {
    this.loadQuiz();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/quiz/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingQuiz && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadQuiz(): void {
    this.quizService.getQuiz().subscribe({
      next: (data: Quiz[]) => {
        this.quizList = data;
        this.filterQuiz();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => console.error('Erreur chargement quiz', err)
    });
  }

  filterQuiz(): void {
    this.filteredQuiz = this.quizList.filter((q) => {
      return (
        !this.searchTerm ||
        q.nomQuiz.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (q.categorie && q.categorie.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    });
  }

  startAdd(): void {
    this.editingQuiz = null;
    this.formData = {
      nomQuiz: '',
      points: 50,
      description: '',
      categorie: 'Histoire & Empires',
      nombreQuestions: 5
    };
    this.isEditing = true;
    this.router.navigate(['/quiz/ajouter']);
  }

  startEdit(quiz: Quiz): void {
    this.editingQuiz = quiz;
    this.formData = { ...quiz };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingQuiz = null;
    this.router.navigate(['/quiz']);
  }

  formatPoints(points: any): string {
    if (points === null || points === undefined) return '50 pts';
    const str = String(points).trim();
    if (str.endsWith('pts')) return str;
    return `${str} pts`;
  }

  saveQuiz(): void {
    if (!this.formData.nomQuiz || !this.formData.nomQuiz.trim()) {
      alert('Veuillez renseigner le nom du quiz.');
      return;
    }

    if (this.editingQuiz && this.editingQuiz.id) {
      this.quizService.updateQuiz(this.editingQuiz.id, this.formData as Quiz).subscribe({
        next: (updated) => {
          const idx = this.quizList.findIndex((q) => String(q.id) === String(updated.id));
          if (idx !== -1) {
            this.quizList[idx] = updated;
          } else {
            this.loadQuiz();
          }
          this.filterQuiz();
          this.cancelEdit();
        }
      });
    } else {
      this.quizService.createQuiz(this.formData as Quiz).subscribe({
        next: (created) => {
          this.quizList.unshift(created);
          this.filterQuiz();
          this.cancelEdit();
        }
      });
    }
  }

  deleteQuiz(quiz: Quiz): void {
    if (!quiz.id) return;
    if (confirm(`Confirmez-vous la suppression du quiz "${quiz.nomQuiz}" ?`)) {
      this.quizService.deleteQuiz(quiz.id).subscribe({
        next: () => {
          this.quizList = this.quizList.filter((q) => String(q.id) !== String(quiz.id));
          this.filterQuiz();
        }
      });
    }
  }
}
