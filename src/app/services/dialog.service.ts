import { Injectable, signal } from '@angular/core';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  icon?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: DialogType;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  // État du modal actif
  readonly isOpen = signal<boolean>(false);
  readonly currentOptions = signal<DialogOptions | null>(null);
  readonly isAlertOnly = signal<boolean>(false);

  private resolver: ((value: boolean) => void) | null = null;

  // État des toasts
  readonly toasts = signal<ToastMessage[]>([]);
  private toastCounter = 0;

  /**
   * Ouvre une boîte de confirmation personnalisée et retourne une promesse résolue avec true ou false.
   */
  confirm(options: DialogOptions): Promise<boolean> {
    this.isAlertOnly.set(false);
    this.currentOptions.set({
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      type: 'danger',
      ...options
    });
    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /**
   * Ouvre une boîte d'alerte informative avec un unique bouton "OK".
   */
  alert(options: { title: string; message: string; type?: DialogType; okText?: string }): Promise<void> {
    this.isAlertOnly.set(true);
    this.currentOptions.set({
      title: options.title,
      message: options.message,
      confirmText: options.okText || 'Compris',
      type: options.type || 'info'
    });
    this.isOpen.set(true);

    return new Promise<void>((resolve) => {
      this.resolver = () => resolve();
    });
  }

  /**
   * Validation de l'action par l'utilisateur
   */
  handleConfirm(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(true);
      this.resolver = null;
    }
  }

  /**
   * Annulation de l'action par l'utilisateur
   */
  handleCancel(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }
  }

  /**
   * Affiche un toast temporaire en haut ou bas de l'écran
   */
  toast(message: string, type: DialogType = 'success', title?: string, durationMs: number = 4000): void {
    const id = ++this.toastCounter;
    const newToast: ToastMessage = { id, message, type, title };
    this.toasts.update((current) => [...current, newToast]);

    setTimeout(() => {
      this.dismissToast(id);
    }, durationMs);
  }

  dismissToast(id: number): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  // Raccourcis pour toasts
  toastSuccess(message: string, title: string = 'Succès'): void {
    this.toast(message, 'success', title);
  }

  toastError(message: string, title: string = 'Erreur'): void {
    this.toast(message, 'danger', title, 5000);
  }

  toastWarning(message: string, title: string = 'Attention'): void {
    this.toast(message, 'warning', title);
  }

  toastInfo(message: string, title: string = 'Information'): void {
    this.toast(message, 'info', title);
  }
}

