import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Observable, finalize } from 'rxjs';

import {
  LucideAngularModule,
  ArrowLeft,
  MapPin,
  Clock,
  Search,
  CheckCircle,
  MessageCircle,
  ChevronRight,
} from 'lucide-angular';

import { RequestService } from '../../../core/services/request.service';
import { WorkerService } from '../../../core/services/worker.service';

import { ServiceRequest } from '../../../models/request.model';
import { WorkerProfile } from '../../../models/worker.profile.model';

import { Category } from '../../../models/enums/category.enum';
import { WorkerStatus } from '../../../models/enums/worker-status.enum';
import { ServiceRequestStatus } from '../../../models/enums/service-request-status.enum';

@Component({
  selector: 'app-open-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './open-requests.html',
  styleUrl: './open-requests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenRequestsComponent implements OnInit {
  private readonly workerService = inject(WorkerService);
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);

  readonly icons = {
    ArrowLeft,
    MapPin,
    Clock,
    Search,
    CheckCircle,
    MessageCircle,
    ChevronRight,
  };

  readonly profile = signal<WorkerProfile | null>(null);
  readonly requests = signal<ServiceRequest[]>([]);

  readonly loading = signal(true);
  readonly error = signal(false);

  readonly selectedCategory = signal<Category | null>(null);

  readonly categories = computed<Category[]>(() => this.profile()?.categories ?? []);

  readonly isVerified = computed(
    () => this.profile()?.verified === true && this.profile()?.status === WorkerStatus.VERIFIED,
  );

  readonly filteredRequests = computed(() => {
    const category = this.selectedCategory();

    if (!category) {
      return this.requests();
    }

    return this.requests().filter((request) => request.category === category);
  });

  readonly hasRequests = computed(() => this.filteredRequests().length > 0);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set(false);

    this.workerService
      .getProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loadOpenRequests(profile);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  private loadOpenRequests(profile: WorkerProfile): void {
    if (profile.status !== WorkerStatus.VERIFIED || !profile.verified) {
      this.requests.set([]);
      return;
    }

    if (profile.categories.length === 0) {
      this.requests.set([]);
      return;
    }

    const requestsByCategory: Observable<ServiceRequest[]>[] = profile.categories.map((category) =>
      this.requestService.getOpenRequests(category),
    );

    forkJoin(requestsByCategory).subscribe({
      next: (results) => {
        const mergedRequests = results.flat();

        const uniqueRequests = Array.from(
          new Map(mergedRequests.map((request) => [request.id, request])).values(),
        );

        /*
         * Antes filtrábamos las solicitudes donde este worker
         * ya había enviado una propuesta.
         *
         * Ahora NO las eliminamos.
         *
         * La solicitud sigue siendo visible para que el worker
         * pueda consultar el estado de su participación.
         */
        this.requests.set(uniqueRequests);
      },
      error: () => {
        this.error.set(true);
      },
    });
  }

  selectCategory(category: Category | null): void {
    this.selectedCategory.set(category);
  }

  openRequest(request: ServiceRequest): void {
    /*
     * La navegación sigue siendo la misma.
     *
     * El RequestDetail será quien determine qué acciones
     * puede realizar este worker según el estado de la solicitud
     * y si ya existe una propuesta propia.
     */
    this.router.navigate(['/requests', request.id]);
  }

  hasOwnProposal(request: ServiceRequest): boolean {
    const workerId = this.profile()?.id;

    if (!workerId) {
      return false;
    }

    return request.proposals.some((proposal) => proposal.workerId === workerId);
  }

  isUnavailable(request: ServiceRequest): boolean {
    return request.status !== ServiceRequestStatus.OPEN || this.isExpired(request);
  }

  isExpired(request: ServiceRequest): boolean {
    return new Date(request.expiresAt).getTime() <= Date.now();
  }

  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  getTimeLabel(date: string): string {
    const createdAt = new Date(date);
    const now = new Date();

    const differenceMs = now.getTime() - createdAt.getTime();
    const differenceMinutes = Math.floor(differenceMs / 60000);

    if (differenceMinutes < 1) {
      return 'Hace unos segundos';
    }

    if (differenceMinutes < 60) {
      return `Hace ${differenceMinutes} ${differenceMinutes === 1 ? 'minuto' : 'minutos'}`;
    }

    const differenceHours = Math.floor(differenceMinutes / 60);

    if (differenceHours < 24) {
      return `Hace ${differenceHours} ${differenceHours === 1 ? 'hora' : 'horas'}`;
    }

    const differenceDays = Math.floor(differenceHours / 24);

    if (differenceDays < 30) {
      return `Hace ${differenceDays} ${differenceDays === 1 ? 'día' : 'días'}`;
    }

    return createdAt.toLocaleDateString('es-AR');
  }

  getExpirationLabel(date: string): string {
    const expiresAt = new Date(date);
    const now = new Date();

    const differenceMs = expiresAt.getTime() - now.getTime();

    if (differenceMs <= 0) {
      return 'Expirada';
    }

    const differenceHours = Math.floor(differenceMs / 3600000);

    if (differenceHours < 24) {
      return 'Vence hoy';
    }

    const differenceDays = Math.floor(differenceHours / 24);

    if (differenceDays === 1) {
      return 'Vence mañana';
    }

    return `Vence en ${differenceDays} días`;
  }

  retry(): void {
    this.loadRequests();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/worker']);
  }
}
