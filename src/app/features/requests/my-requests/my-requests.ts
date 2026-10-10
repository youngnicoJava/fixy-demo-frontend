import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { RequestService } from '../../../core/services/request.service';
import { ServiceRequest } from '../../../models/request.model';
import { ServiceRequestStatus } from '../../../models/enums/service-request-status.enum';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyRequestsComponent implements OnInit {
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);

  readonly requests = signal<ServiceRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly hasRequests = computed(() => this.requests().length > 0);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set(false);

    this.requestService
      .getMyRequests()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (requests) => {
          this.requests.set(requests);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  openRequest(requestId: number): void {
    this.router.navigate(['/requests', requestId]);
  }

  createRequest(): void {
    this.router.navigate(['/requests/new']);
  }

  getStatusLabel(status: ServiceRequestStatus): string {
    const labels: Record<ServiceRequestStatus, string> = {
      [ServiceRequestStatus.OPEN]: 'Abierta',
      [ServiceRequestStatus.MATCHED]: 'Profesional seleccionado',
      [ServiceRequestStatus.IN_PROGRESS]: 'En progreso',
      [ServiceRequestStatus.COMPLETED]: 'Completada',
      [ServiceRequestStatus.CANCELLED]: 'Cancelada',
      [ServiceRequestStatus.EXPIRED]: 'Expirada',
      [ServiceRequestStatus.DISPUTED]: 'En disputa',
    };

    return labels[status];
  }

  getStatusClass(status: ServiceRequestStatus): string {
    const classes: Record<ServiceRequestStatus, string> = {
      [ServiceRequestStatus.OPEN]: 'status--open',
      [ServiceRequestStatus.MATCHED]: 'status--matched',
      [ServiceRequestStatus.IN_PROGRESS]: 'status--progress',
      [ServiceRequestStatus.COMPLETED]: 'status--completed',
      [ServiceRequestStatus.CANCELLED]: 'status--cancelled',
      [ServiceRequestStatus.EXPIRED]: 'status--expired',
      [ServiceRequestStatus.DISPUTED]: 'status--disputed',
    };

    return classes[status];
  }

  getCategoryLabel(category: string): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  trackByRequestId(_: number, request: ServiceRequest): number {
    return request.id;
  }
}
