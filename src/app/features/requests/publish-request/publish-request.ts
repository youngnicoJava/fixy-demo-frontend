import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ArrowLeft, CheckCircle, MapPin, Send } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import { RequestService } from '../../../core/services/request.service';
import { Category } from '../../../models/enums/category.enum';
import { ServiceRequestRequest } from '../../../models/request.model';

@Component({
  selector: 'app-publish-request',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './publish-request.html',
  styleUrl: './publish-request.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublishRequestComponent {
  private readonly router = inject(Router);
  private readonly requestService = inject(RequestService);

  readonly icons = {
    ArrowLeft,
    CheckCircle,
    MapPin,
    Send,
  };

  readonly publishing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly request = signal<ServiceRequestRequest | null>(null);

  constructor() {
    this.loadDraft();
  }

  private loadDraft(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as
      | {
          request?: ServiceRequestRequest;
        }
      | undefined;

    if (!state?.request) {
      this.router.navigate(['/requests/new']);
      return;
    }

    this.request.set(state.request);
  }

  publish(): void {
    const request = this.request();

    if (!request || this.publishing()) {
      return;
    }

    this.publishing.set(true);
    this.errorMessage.set(null);

    this.requestService
      .createRequest(request)
      .pipe(
        finalize(() => {
          this.publishing.set(false);
        }),
      )
      .subscribe({
        next: (createdRequest) => {
          this.router.navigate(['/requests', createdRequest.id]);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/requests/new']);
  }

  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private getErrorMessage(error: any): string {
    return (
      error?.error?.message ??
      error?.message ??
      'No pudimos publicar la solicitud. Intentá nuevamente.'
    );
  }
}
