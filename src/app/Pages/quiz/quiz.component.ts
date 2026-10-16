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
  isSubmitting: boolean = false;
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
        const seen = new Set<string>();
        const uniqueList: Quiz[] = [];
        for (const item of data) {
          const rawName = (item.nomQuiz || '').trim();
          const cleanKey = rawName.toLowerCase().replace(/^(el|le|la|les)\s+/, '');
          if (!cleanKey || seen.has(cleanKey)) continue;
          seen.add(cleanKey);
          uniqueList.push(item);
        }
        this.quizList = uniqueList;
        this.filterQuiz();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => console.error('Erreur chargement quiz', err)
    });
  }

  getQuizImage(q: Quiz): string {
    const raw = q.imageUrl || q.imageQuiz || q.logoUrl;
    if (raw && raw.trim().length > 0 && !raw.includes('ccdf2147-5998-4f94-8db4-683bc327e128')) {
      return raw.trim();
    }
    const name = (q.nomQuiz || '').toLowerCase();
    if (name.includes('histoire') || name.includes('empire') || name.includes('soundiata')) {
      return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
    } else if (name.includes('ville') || name.includes('patrimoine') || name.includes('djenne') || name.includes('tombouctou')) {
      return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80';
    } else if (name.includes('cuisine') || name.includes('terroir') || name.includes('gastro') || name.includes('plat')) {
      return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80';
    } else if (name.includes('président') || name.includes('president') || name.includes('république')) {
      return 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=800&q=80';
    } else if (name.includes('culture') || name.includes('art') || name.includes('tradition')) {
      return 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=80';
    }
    return raw?.trim() || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
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
    this.resetForm();
    this.router.navigate(['/quiz']);
  }

  resetForm(): void {
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
    this.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.editingQuiz = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.isUploadingImage = false;
    this.isDragging = false;
  }

  formatPoints(points: any): string {
    if (points === null || points === undefined) return '50 pts';
    const str = String(points).trim();
    if (str.endsWith('pts')) return str;
    return `${str} pts`;
  }

  saveQuiz(): void {
    if (this.isSubmitting) return;

    if (this.isUploadingImage) {
      alert('Veuillez patienter pendant la fin du téléversement du logo vers Supabase...');
      return;
    }

    if (!this.formData.nomQuiz || !this.formData.nomQuiz.trim()) {
      alert('Veuillez renseigner le nom du quiz.');
      return;
    }

    this.isSubmitting = true;

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

    const editingId = this.editingQuiz?.id ?? (this.editingQuiz as any)?.idQuiz ?? this.formData.id ?? (this.formData as any)?.idQuiz;

    if (this.editingQuiz && editingId) {
      this.quizService.updateQuiz(editingId, quizToSave).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          const idx = this.quizList.findIndex((q) => String(q.id ?? (q as any).idQuiz) === String(editingId));
          if (idx !== -1) {
            this.quizList[idx] = { ...this.quizList[idx], ...updated, id: editingId };
          } else {
            this.loadQuiz();
          }
          this.filterQuiz();
          this.cancelEdit();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur mise à jour quiz:', err);
          alert('Erreur lors de la modification du quiz : ' + (err?.error?.message || err.message));
        }
      });
    } else {
      this.quizService.createQuiz(quizToSave).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.quizList.unshift(created);
          this.filterQuiz();
          this.cancelEdit();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur création quiz:', err);
          alert('Erreur lors de la création du quiz : ' + (err?.error?.message || err.message));
        }
      });
    }
  }

  deleteQuiz(quiz: Quiz): void {
    const id = quiz.id ?? (quiz as any).idQuiz;
    if (!id) return;
    if (confirm(`Confirmez-vous la suppression du quiz "${quiz.nomQuiz}" ?`)) {
      this.quizService.deleteQuiz(id).subscribe({
        next: () => {
          this.quizList = this.quizList.filter((q) => String(q.id ?? (q as any).idQuiz) !== String(id));
          this.filterQuiz();
        },
        error: (err) => {
          console.error('Erreur suppression quiz:', err);
          alert('Impossible de supprimer ce quiz : ' + (err?.error?.message || err.message));
        }
      });
    }
  }
}
