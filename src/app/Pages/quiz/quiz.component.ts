import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, forkJoin, of } from 'rxjs';
import { QuizService } from '../../services/quiz.service';
import { QuestionService } from '../../services/question.service';
import { UploadService } from '../../services/upload.service';
import { DialogService } from '../../services/dialog.service';
import { Quiz } from '../../models/quiz.model';
import { Question } from '../../models/question.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly questionService = inject(QuestionService);
  private readonly uploadService = inject(UploadService);
  private readonly dialogService = inject(DialogService);
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
    nombreQuestions: 0,
    imageUrl: '',
    imageQuiz: '',
    logoUrl: ''
  };

  // --- Gestion unifiée des Questions du Quiz (QCM complet) ---
  quizQuestions: Question[] = [];
  questionsCountMap: Record<string, number> = {};
  showQuestionForm: boolean = false;
  editingQuestionIndex: number | null = null;
  isSavingQuestion: boolean = false;

  questionForm: {
    id?: number | string;
    question: string;
    theme: string;
    duree: string;
    points: number;
    options: string[];
    correctOptionIndex: number;
    explication: string;
  } = this.getEmptyQuestionForm();

  ngOnInit(): void {
    this.loadQuiz();
    this.loadAllQuestionsCounts();
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkRoute(event.urlAfterRedirects);
        this.cdr.detectChanges();
      });
  }

  private getEmptyQuestionForm() {
    return {
      id: undefined,
      question: '',
      theme: this.formData.categorie || 'Culture générale',
      duree: '30s',
      points: 10,
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explication: ''
    };
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

  /**
   * Charge le nombre réel de questions par quiz pour l'affichage dans le tableau
   */
  loadAllQuestionsCounts(): void {
    this.questionService.getQuestions().subscribe({
      next: (questions: Question[]) => {
        const counts: Record<string, number> = {};
        for (const q of questions) {
          if (q.quizId !== undefined && q.quizId !== null) {
            const key = String(q.quizId);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        this.questionsCountMap = counts;
        this.cdr.markForCheck();
      }
    });
  }

  getQuizQuestionsCount(q: Quiz): number {
    const id = q.id ?? (q as any).idQuiz;
    if (id !== undefined && this.questionsCountMap[String(id)] !== undefined) {
      return this.questionsCountMap[String(id)];
    }
    return q.nombreQuestions ?? 0;
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

  /**
   * Charge les questions associées au quiz en cours d'édition
   */
  loadQuestionsForCurrentQuiz(quizId: number | string): void {
    this.questionService.getQuestionsByQuiz(quizId).subscribe({
      next: (questions: Question[]) => {
        this.quizQuestions = questions;
        this.formData.nombreQuestions = questions.length;
        this.questionsCountMap[String(quizId)] = questions.length;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement des questions du quiz', err)
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
    this.quizQuestions = [];
    this.showQuestionForm = false;
    this.editingQuestionIndex = null;
    this.formData = {
      nomQuiz: '',
      points: 50,
      description: '',
      categorie: 'Histoire & Empires',
      nombreQuestions: 0,
      imageUrl: '',
      imageQuiz: '',
      logoUrl: ''
    };
    this.questionForm = this.getEmptyQuestionForm();
    this.isEditing = true;
    this.router.navigate(['/quiz/ajouter']);
  }

  startEdit(quiz: Quiz): void {
    this.editingQuiz = quiz;
    this.imageUrl = quiz.imageUrl || quiz.imageQuiz || quiz.logoUrl || '';
    this.selectedFileName = this.imageUrl ? 'Logo actuel' : '';
    this.selectedFileSize = '';
    this.quizQuestions = [];
    this.showQuestionForm = false;
    this.editingQuestionIndex = null;
    this.formData = {
      ...quiz,
      categorie: quiz.categorie || 'Histoire & Empires',
      imageUrl: this.imageUrl,
      imageQuiz: this.imageUrl,
      logoUrl: this.imageUrl
    };
    const quizId = quiz.id ?? (quiz as any).idQuiz;
    if (quizId) {
      this.loadQuestionsForCurrentQuiz(quizId);
    }
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
    this.router.navigate(['/quiz']);
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.formData = {
      nomQuiz: '',
      points: 50,
      description: '',
      categorie: 'Histoire & Empires',
      nombreQuestions: 0,
      imageUrl: '',
      imageQuiz: '',
      logoUrl: ''
    };
    this.imageUrl = '';
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.editingQuiz = null;
    this.quizQuestions = [];
    this.showQuestionForm = false;
    this.editingQuestionIndex = null;
    this.questionForm = this.getEmptyQuestionForm();
    this.isEditing = false;
    this.isSubmitting = false;
    this.isUploadingImage = false;
    this.isDragging = false;
    this.cdr.detectChanges();
  }

  // --- Méthodes de gestion des Questions intégrées au Quiz ---

  openAddQuestionForm(): void {
    this.editingQuestionIndex = null;
    this.questionForm = this.getEmptyQuestionForm();
    this.showQuestionForm = true;
  }

  editQuestionInQuiz(index: number): void {
    const q = this.quizQuestions[index];
    if (!q) return;

    this.editingQuestionIndex = index;
    const rawOpts = q.options && q.options.length > 0
      ? [...q.options]
      : (q.propositions && q.propositions.length > 0 ? [...q.propositions] : [q.reponse || '', '', '', '']);
    while (rawOpts.length < 4) {
      rawOpts.push('');
    }
    const fourOptions = rawOpts.slice(0, 4);
    const rep = (q.reponse || '').trim();
    let correctIdx = fourOptions.findIndex((o) => o.trim().toLowerCase() === rep.toLowerCase());
    if (correctIdx === -1) {
      fourOptions[0] = rep;
      correctIdx = 0;
    }

    this.questionForm = {
      id: q.id ?? q.idQuestion,
      question: q.question || q.nomQuestion || '',
      theme: q.theme || this.formData.categorie || 'Culture générale',
      duree: String(q.duree || '30s'),
      points: q.points || 10,
      options: fourOptions,
      correctOptionIndex: correctIdx,
      explication: q.explication || ''
    };
    this.showQuestionForm = true;
  }

  cancelQuestionForm(): void {
    this.showQuestionForm = false;
    this.editingQuestionIndex = null;
    this.questionForm = this.getEmptyQuestionForm();
  }

  /**
   * Valide et enregistre une question dans le quiz courant
   */
  saveQuestionInQuiz(): void {
    if (this.isSavingQuestion) return;

    const enonce = (this.questionForm.question || '').trim();
    if (!enonce) {
      alert('Veuillez saisir l’énoncé de la question.');
      return;
    }

    const trimmedOptions = this.questionForm.options.map((o) => (o || '').trim());
    const filledOptions = trimmedOptions.filter((o) => o.length > 0);
    if (filledOptions.length < 2) {
      alert('Veuillez renseigner au moins 2 propositions de réponse pour le QCM.');
      return;
    }

    const selectedCorrect = (trimmedOptions[this.questionForm.correctOptionIndex] || '').trim();
    const bonneReponse = selectedCorrect || filledOptions[0];

    const editingQuizId = this.editingQuiz?.id ?? (this.editingQuiz as any)?.idQuiz ?? this.formData.id;

    const questionObj: Question = {
      id: this.questionForm.id,
      idQuestion: this.questionForm.id,
      question: enonce,
      nomQuestion: enonce,
      reponse: bonneReponse,
      theme: (this.questionForm.theme || this.formData.categorie || 'Culture générale').trim(),
      duree: this.questionForm.duree || '30s',
      points: Number(this.questionForm.points) || 10,
      options: filledOptions,
      propositions: filledOptions,
      explication: (this.questionForm.explication || '').trim(),
      quizId: editingQuizId ? Number(editingQuizId) : undefined
    };

    // Si le quiz existe déjà en base de données, persister immédiatement la question via l'API
    if (editingQuizId) {
      this.isSavingQuestion = true;
      const targetQuestionId = questionObj.id ?? questionObj.idQuestion;

      if (this.editingQuestionIndex !== null && targetQuestionId) {
        this.questionService.updateQuestion(targetQuestionId, questionObj).subscribe({
          next: (updated) => {
            this.isSavingQuestion = false;
            if (this.editingQuestionIndex !== null) {
              this.quizQuestions[this.editingQuestionIndex] = updated;
            }
            this.formData.nombreQuestions = this.quizQuestions.length;
            this.questionsCountMap[String(editingQuizId)] = this.quizQuestions.length;
            this.cancelQuestionForm();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isSavingQuestion = false;
            console.error('Erreur modification question :', err);
            alert('Impossible de modifier la question.');
          }
        });
      } else {
        this.questionService.createQuestion(questionObj).subscribe({
          next: (created) => {
            this.isSavingQuestion = false;
            if (this.editingQuestionIndex !== null) {
              this.quizQuestions[this.editingQuestionIndex] = created;
            } else {
              this.quizQuestions.push(created);
            }
            this.formData.nombreQuestions = this.quizQuestions.length;
            this.questionsCountMap[String(editingQuizId)] = this.quizQuestions.length;
            this.cancelQuestionForm();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isSavingQuestion = false;
            console.error('Erreur création question :', err);
            alert('Impossible d’ajouter la question.');
          }
        });
      }
    } else {
      // Nouveau quiz non encore enregistré : ajout dans la liste locale qui sera sauvegardée avec le quiz
      if (this.editingQuestionIndex !== null) {
        this.quizQuestions[this.editingQuestionIndex] = questionObj;
      } else {
        this.quizQuestions.push(questionObj);
      }
      this.formData.nombreQuestions = this.quizQuestions.length;
      this.cancelQuestionForm();
      this.cdr.markForCheck();
    }
  }

  async deleteQuestionInQuiz(index: number): Promise<void> {
    const q = this.quizQuestions[index];
    if (!q) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer la question',
      message: `Confirmez-vous la suppression de la question "${q.question}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    const qId = q.id ?? q.idQuestion;
    const editingQuizId = this.editingQuiz?.id ?? (this.editingQuiz as any)?.idQuiz;

    if (qId && editingQuizId) {
      this.questionService.deleteQuestion(qId).subscribe({
        next: () => {
          this.quizQuestions.splice(index, 1);
          this.formData.nombreQuestions = this.quizQuestions.length;
          this.questionsCountMap[String(editingQuizId)] = this.quizQuestions.length;
          this.dialogService.toastSuccess('Question supprimée avec succès.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur suppression question :', err);
          this.dialogService.toastError('Impossible de supprimer cette question.');
        }
      });
    } else {
      this.quizQuestions.splice(index, 1);
      this.formData.nombreQuestions = this.quizQuestions.length;
      this.dialogService.toastSuccess('Question retirée du quiz.');
      this.cdr.markForCheck();
    }
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

    // Si l'administrateur a rempli une question dans le sous-formulaire sans avoir cliqué sur "Valider la question", on l'inclut
    if (this.showQuestionForm && this.questionForm.question.trim().length > 0) {
      const filled = this.questionForm.options.map((o) => (o || '').trim()).filter((o) => o.length > 0);
      if (filled.length >= 2) {
        this.saveQuestionInQuiz();
      }
    }

    this.isSubmitting = true;

    const defaultQuizImage = 'https://dzhqwkpwaljqsjwoqvso.supabase.co/storage/v1/object/public/maliexplorer-media/quiz/ccdf2147-5998-4f94-8db4-683bc327e128_A_Visit_to_the_Dogon_Tribe_High_in_the_Bandiagara___Travel_Photographs_By_Rosemary_Sheel.jpg';
    const img = (this.imageUrl || this.formData.imageUrl || '').trim() || defaultQuizImage;
    const quizToSave: Quiz = {
      ...this.formData,
      nomQuiz: this.formData.nomQuiz.trim(),
      description: this.formData.description?.trim() || '',
      categorie: this.formData.categorie || 'Histoire & Empires',
      nombreQuestions: this.quizQuestions.length || this.formData.nombreQuestions || 0,
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
            this.quizList[idx] = {
              ...this.quizList[idx],
              ...updated,
              id: editingId,
              nombreQuestions: this.quizQuestions.length
            };
          } else {
            this.loadQuiz();
          }
          this.questionsCountMap[String(editingId)] = this.quizQuestions.length;
          this.filterQuiz();
          this.cancelEdit();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur mise à jour quiz:', err);
          alert('Erreur lors de la modification du quiz : ' + (err?.error?.message || err.message));
          this.cdr.detectChanges();
        }
      });
    } else {
      this.quizService.createQuiz(quizToSave).subscribe({
        next: (created) => {
          const newQuizId = created.id ?? (created as any).idQuiz;
          // Sauvegarder toutes les questions préparées pour ce nouveau quiz
          if (newQuizId && this.quizQuestions.length > 0) {
            const createCalls = this.quizQuestions.map((q) =>
              this.questionService.createQuestion({
                ...q,
                quizId: Number(newQuizId)
              })
            );
            forkJoin(createCalls).subscribe({
              next: (savedQuestions) => {
                this.isSubmitting = false;
                created.nombreQuestions = savedQuestions.length;
                this.questionsCountMap[String(newQuizId)] = savedQuestions.length;
                this.quizList.unshift(created);
                this.filterQuiz();
                this.cancelEdit();
                this.cdr.detectChanges();
              },
              error: (qErr) => {
                console.error('Erreur lors de la sauvegarde des questions du nouveau quiz :', qErr);
                this.isSubmitting = false;
                this.quizList.unshift(created);
                this.filterQuiz();
                this.cancelEdit();
                this.cdr.detectChanges();
              }
            });
          } else {
            this.isSubmitting = false;
            this.quizList.unshift(created);
            this.filterQuiz();
            this.cancelEdit();
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur création quiz:', err);
          alert('Erreur lors de la création du quiz : ' + (err?.error?.message || err.message));
          this.cdr.detectChanges();
        }
      });
    }
  }

  async deleteQuiz(quiz: Quiz): Promise<void> {
    const id = quiz.id ?? (quiz as any).idQuiz;
    if (!id) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Supprimer le quiz',
      message: `Confirmez-vous la suppression du quiz "${quiz.nomQuiz}" et de toutes ses questions associées ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.quizService.deleteQuiz(id).subscribe({
      next: () => {
        this.quizList = this.quizList.filter((q) => String(q.id ?? (q as any).idQuiz) !== String(id));
        this.filterQuiz();
        this.dialogService.toastSuccess(`Quiz "${quiz.nomQuiz}" supprimé avec succès.`);
      },
      error: (err) => {
        console.error('Erreur suppression quiz:', err);
        this.dialogService.toastError('Impossible de supprimer ce quiz : ' + (err?.error?.message || err.message));
      }
    });
  }
}
