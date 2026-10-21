import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService, DialogType } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog-modal.component.html',
  styleUrl: './dialog-modal.component.css'
})
export class DialogModalComponent {
  readonly dialogService = inject(DialogService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogService.isOpen()) {
      this.dialogService.handleCancel();
    }
  }

  get options() {
    return this.dialogService.currentOptions();
  }

  get isAlertOnly() {
    return this.dialogService.isAlertOnly();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.dialogService.handleCancel();
    }
  }

  getIconType(): DialogType {
    return this.options?.type || 'danger';
  }
}

