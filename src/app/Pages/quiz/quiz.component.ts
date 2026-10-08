import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { QuizService } from '../../services/quiz.service';
import { UploadService } from '../../services/upload.service';
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
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  quizList: Quiz[] = [];
  filteredQuiz: Quiz[] = [];
  searchTerm: string = '';

  imageUrl: string = '';
  isUploadingImage: boolean = false;
  isDragging: boolean = false;
  selectedFileName: string = '';
  selectedFileSize: string = '';

  isEditing: boolean = false;
  editingQuiz: Quiz | null = null;
  formData: Partial<Quiz> = {
    nomQuiz: '',
    points: 50,
    description: '',
    categorie: 'Histoire & Empires',
    nombreQuestions: 5,
    imageUrl: '',
    imageQuiz: '',
    logoUrl: ''
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

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      this.uploadFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  private uploadFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }

    this.selectedFileName = file.name;
    const sizeInKb = (file.size / 1024).toFixed(1);
    this.selectedFileSize = `${sizeInKb} Ko`;
    this.isUploadingImage = true;

    this.uploadService.uploadImage(file, 'quiz', 'QUIZ', this.editingQuiz?.id ?? undefined).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.formData.imageUrl = url;
        this.formData.imageQuiz = url;
        this.formData.logoUrl = url;
        this.isUploadingImage = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur téléversement image quiz:', err);
        this.isUploadingImage = false;
        alert(err.message || 'Erreur lors du téléversement du logo.');
        this.cdr.markForCheck();
      }
    });
  }

  removeImage(): void {
    this.imageUrl = '';
    this.formData.imageUrl = '';
    this.formData.imageQuiz = '';
    this.formData.logoUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
  }

  startAdd(): void {
    this.editingQuiz = null;
    this.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.formData = {
      nomQuiz: '',
      points: 50,
      description: '',
      categorie: 'Histoire & Empires',
      nombreQuestions: 5,
      imageUrl: '',
      imageQuiz: '',
      logoUrl: ''
    };
    this.isEditing = true;
    this.router.navigate(['/quiz/ajouter']);
  }

  startEdit(quiz: Quiz): void {
    this.editingQuiz = quiz;
    this.imageUrl = quiz.imageUrl || quiz.imageQuiz || quiz.logoUrl || '';
    this.selectedFileName = this.imageUrl ? 'Logo actuel' : '';
    this.selectedFileSize = '';
    this.formData = {
      ...quiz,
      imageUrl: this.imageUrl,
      imageQuiz: this.imageUrl,
      logoUrl: this.imageUrl
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingQuiz = null;
    this.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.router.navigate(['/quiz']);
  }

  formatPoints(points: any): string {
    if (points === null || points === undefined) return '50 pts';
    const str = String(points).trim();
    if (str.endsWith('pts')) return str;
    return `${str} pts`;
  }

  saveQuiz(): void {
    if (this.isUploadingImage) {
      alert('Veuillez patienter pendant la fin du téléversement du logo vers Supabase...');
      return;
    }

    if (!this.formData.nomQuiz || !this.formData.nomQuiz.trim()) {
      alert('Veuillez renseigner le nom du quiz.');
      return;
    }

    const defaultQuizImage = 'https://dzhqwkpwaljqsjwoqvso.supabase.co/storage/v1/object/public/maliexplorer-media/quiz/ccdf2147-5998-4f94-8db4-683bc327e128_A_Visit_to_the_Dogon_Tribe_High_in_the_Bandiagara___Travel_Photographs_By_Rosemary_Sheel.jpg';
    const img = (this.imageUrl || this.formData.imageUrl || '').trim() || defaultQuizImage;
    const quizToSave: Quiz = {
      ...this.formData,
      nomQuiz: this.formData.nomQuiz.trim(),
      description: this.formData.description?.trim() || '',
      imageUrl: img,
      imageQuiz: img,
      logoUrl: img
    } as Quiz;

    if (this.editingQuiz && this.editingQuiz.id) {
      this.quizService.updateQuiz(this.editingQuiz.id, quizToSave).subscribe({
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
      this.quizService.createQuiz(quizToSave).subscribe({
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
