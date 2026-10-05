import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  quizList: Quiz[] = [];
  filteredQuiz: Quiz[] = [];
  searchTerm: string = '';

  showModal: boolean = false;
  editingQuiz: Quiz | null = null;
  formData: Partial<Quiz> = {
    nomQuiz: '',
    points: 100,
    description: '',
    categorie: 'Histoire & Empires',
    nombreQuestions: 5
  };

  ngOnInit(): void {
    // this.loadQuiz();
  }

  // loadQuiz(): void {
  //   this.quizService.getQuiz().subscribe({
  //     next: (data) => {
  //       this.quizList = data;
  //       this.filterQuiz();
  //     },
  //     error: (err) => console.error('Erreur chargement quiz', err)
  //   });
  // }

  filterQuiz(): void {
    this.filteredQuiz = this.quizList.filter((q) => {
      return (
        !this.searchTerm ||
        q.nomQuiz.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (q.categorie && q.categorie.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    });
  }

  openAddModal(): void {
    this.editingQuiz = null;
    this.formData = {
      nomQuiz: '',
      points: 100,
      description: '',
      categorie: 'Histoire & Empires',
      nombreQuestions: 5
    };
    this.showModal = true;
  }

  openEditModal(quiz: Quiz): void {
    this.editingQuiz = quiz;
    this.formData = { ...quiz };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingQuiz = null;
  }

  saveQuiz(): void {
    if (!this.formData.nomQuiz) {
      alert('Veuillez renseigner le nom du quiz.');
      return;
    }

    if (this.editingQuiz && this.editingQuiz.id) {
      this.quizService.updateQuiz(this.editingQuiz.id, this.formData as Quiz).subscribe({
        next: (updated) => {
          const idx = this.quizList.findIndex((q) => q.id === updated.id);
          if (idx !== -1) this.quizList[idx] = updated;
          this.filterQuiz();
          this.closeModal();
        }
      });
    } else {
      this.quizService.createQuiz(this.formData as Quiz).subscribe({
        next: (created) => {
          this.quizList.unshift(created);
          this.filterQuiz();
          this.closeModal();
        }
      });
    }
  }

  deleteQuiz(quiz: Quiz): void {
    if (!quiz.id) return;
    if (confirm(`Confirmez-vous la suppression du quiz "${quiz.nomQuiz}" ?`)) {
      this.quizService.deleteQuiz(quiz.id).subscribe({
        next: () => {
          this.quizList = this.quizList.filter((q) => q.id !== quiz.id);
          this.filterQuiz();
        }
      });
    }
  }
}
