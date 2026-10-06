import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { QuestionService } from '../../services/question.service';
import { Question } from '../../models/question.model';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.css'
})
export class QuestionsComponent implements OnInit {
  private readonly questionService = inject(QuestionService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  searchTerm: string = '';
  selectedTheme: string = 'TOUS';

  isEditing: boolean = false;
  editingQuestion: Question | null = null;
  formData: Partial<Question> = {
    theme: 'Culture générale',
    question: '',
    reponse: '',
    duree: '30s',
    options: ['', '', '', ''],
    explication: ''
  };

  ngOnInit(): void {
    this.loadQuestions();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private checkRoute(url: string): void {
    if (url.includes('/questions/ajouter')) {
      if (!this.isEditing) {
        this.isEditing = true;
      }
    } else if (!this.editingQuestion && this.isEditing) {
      this.isEditing = false;
    }
  }

  loadQuestions(): void {
    this.questionService.getQuestions().subscribe({
      next: (data) => {
        this.questions = data;
        this.filterQuestions();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement questions', err)
    });
  }

  filterQuestions(): void {
    this.filteredQuestions = this.questions.filter((q) => {
      const qText = q.question || q.nomQuestion || '';
      const matchSearch =
        !this.searchTerm ||
        qText.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (q.reponse && q.reponse.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (q.theme && q.theme.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchTheme =
        this.selectedTheme === 'TOUS' ||
        (q.theme && q.theme.toLowerCase() === this.selectedTheme.toLowerCase());

      return matchSearch && matchTheme;
    });
  }

  startAdd(): void {
    this.editingQuestion = null;
    this.formData = {
      theme: 'Culture générale',
      question: '',
      reponse: '',
      duree: '30s',
      options: ['', '', '', ''],
      explication: ''
    };
    this.isEditing = true;
    this.router.navigate(['/questions/ajouter']);
  }

  startEdit(q: Question): void {
    this.editingQuestion = q;
    this.formData = {
      ...q,
      question: q.question || q.nomQuestion || '',
      options: q.options && q.options.length === 4 ? [...q.options] : [q.reponse, '', '', '']
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingQuestion = null;
    this.router.navigate(['/questions']);
  }

  saveQuestion(): void {
    const questionText = (this.formData.question || this.formData.nomQuestion || '').trim();
    const reponseText = (this.formData.reponse || '').trim();

    if (!questionText || !reponseText) {
      alert('Veuillez renseigner l’énoncé de la question et la réponse.');
      return;
    }

    const questionToSave: Question = {
      ...this.formData,
      question: questionText,
      nomQuestion: questionText,
      reponse: reponseText,
      theme: this.formData.theme?.trim() || 'Culture générale',
      duree: this.formData.duree || '30s',
      options: this.formData.options || [reponseText]
    };

    const targetId = this.editingQuestion?.id ?? this.editingQuestion?.idQuestion;
    if (this.editingQuestion && targetId) {
      this.questionService.updateQuestion(targetId, questionToSave).subscribe({
        next: () => {
          this.loadQuestions();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Erreur mise à jour question', err);
          alert('Erreur lors de la modification de la question.');
        }
      });
    } else {
      this.questionService.createQuestion(questionToSave).subscribe({
        next: () => {
          this.loadQuestions();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Erreur création question', err);
          alert('Erreur lors de la création de la question.');
        }
      });
    }
  }

  deleteQuestion(q: Question): void {
    const targetId = q.id ?? q.idQuestion;
    if (!targetId) return;
    const questionText = q.question || q.nomQuestion || 'cette question';
    if (confirm(`Confirmez-vous la suppression de la question "${questionText}" ?`)) {
      this.questionService.deleteQuestion(targetId).subscribe({
        next: () => {
          this.questions = this.questions.filter((item) => (item.id ?? item.idQuestion) !== targetId);
          this.filterQuestions();
        }
      });
    }
  }
}
