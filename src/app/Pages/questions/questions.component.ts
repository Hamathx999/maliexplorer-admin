import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  searchTerm: string = '';
  selectedTheme: string = 'TOUS';

  showModal: boolean = false;
  editingQuestion: Question | null = null;
  formData: Partial<Question> = {
    theme: 'Histoire du Mali',
    question: '',
    reponse: '',
    duree: '30s',
    options: ['', '', '', ''],
    explication: ''
  };

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.questionService.getQuestions().subscribe({
      next: (data) => {
        this.questions = data;
        this.filterQuestions();
      },
      error: (err) => console.error('Erreur chargement questions', err)
    });
  }

  filterQuestions(): void {
    this.filteredQuestions = this.questions.filter((q) => {
      const matchSearch =
        !this.searchTerm ||
        q.question.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        q.reponse.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        q.theme.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchTheme =
        this.selectedTheme === 'TOUS' ||
        q.theme.toLowerCase() === this.selectedTheme.toLowerCase();

      return matchSearch && matchTheme;
    });
  }

  openAddModal(): void {
    this.editingQuestion = null;
    this.formData = {
      theme: 'Histoire du Mali',
      question: '',
      reponse: '',
      duree: '30s',
      options: ['', '', '', ''],
      explication: ''
    };
    this.showModal = true;
  }

  openEditModal(q: Question): void {
    this.editingQuestion = q;
    this.formData = {
      ...q,
      options: q.options && q.options.length === 4 ? [...q.options] : [q.reponse, '', '', '']
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingQuestion = null;
  }

  saveQuestion(): void {
    if (!this.formData.question || !this.formData.reponse) {
      alert('Veuillez renseigner l’énoncé de la question et la bonne réponse.');
      return;
    }

    if (this.editingQuestion && this.editingQuestion.id) {
      this.questionService.updateQuestion(this.editingQuestion.id, this.formData as Question).subscribe({
        next: (updated) => {
          const idx = this.questions.findIndex((q) => q.id === updated.id);
          if (idx !== -1) this.questions[idx] = updated;
          this.filterQuestions();
          this.closeModal();
        }
      });
    } else {
      this.questionService.createQuestion(this.formData as Question).subscribe({
        next: (created) => {
          this.questions.unshift(created);
          this.filterQuestions();
          this.closeModal();
        }
      });
    }
  }

  deleteQuestion(q: Question): void {
    if (!q.id) return;
    if (confirm(`Confirmez-vous la suppression de cette question ?`)) {
      this.questionService.deleteQuestion(q.id).subscribe({
        next: () => {
          this.questions = this.questions.filter((item) => item.id !== q.id);
          this.filterQuestions();
        }
      });
    }
  }
}
