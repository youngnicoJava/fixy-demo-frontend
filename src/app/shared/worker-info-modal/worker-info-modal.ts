import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { LucideAngularModule, X } from 'lucide-angular';
import { WorkerInfoModalService } from '../../core/services/worker-info-modal.service';

@Component({
  selector: 'app-worker-info-modal',
  standalone: true,
  imports: [RouterLink, CdkTrapFocus, LucideAngularModule],
  templateUrl: './worker-info-modal.html',
  styleUrl: './worker-info-modal.scss',
})
export class WorkerInfoModalComponent {
  readonly XIcon = X;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('infoDialog');

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }
  private readonly modalService = inject(WorkerInfoModalService);

  get isOpen(): boolean {
    return this.modalService.isOpen();
  }

  close(): void {
    this.modalService.close();
  }
}
