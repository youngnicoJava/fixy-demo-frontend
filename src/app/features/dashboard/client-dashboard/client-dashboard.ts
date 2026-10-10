import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { FooterComponent } from '../../../shared/footer/footer';

import {
  ArrowRight,
  ClipboardList,
  MapPin,
  MessageCircle,
  Plus,
  Wrench,
  LucideAngularModule,
} from 'lucide-angular';

import { ClientProfileService } from '../../../core/services/client-profile.service';
import { RequestService } from '../../../core/services/request.service';

import { ClientProfile } from '../../../models/client.model';
import { ServiceRequest } from '../../../models/request.model';
import { ServiceRequestStatus } from '../../../models/enums/service-request-status.enum';

// FIX 1: mapas constantes fuera de la clase.
// Antes getStatusLabel creaba un objeto Record en CADA llamada,
// o sea una vez por cada request en el template.
const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  [ServiceRequestStatus.OPEN]: 'Abierta',
  [ServiceRequestStatus.MATCHED]: 'Profesional seleccionado',
  [ServiceRequestStatus.IN_PROGRESS]: 'En progreso',
  [ServiceRequestStatus.COMPLETED]: 'Completada',
  [ServiceRequestStatus.EXPIRED]: 'Expirada',
  [ServiceRequestStatus.CANCELLED]: 'Cancelada',
  [ServiceRequestStatus.DISPUTED]: 'En disputa',
};

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FooterComponent],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDashboardComponent implements OnInit {
  private readonly clientProfileService = inject(ClientProfileService);
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);

  // FIX 2: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  readonly icons = {
    ClipboardList,
    MessageCircle,
    Wrench,
    MapPin,
    Plus,
    ArrowRight,
  };

  // FIX 1: exponemos el mapa al template.
  readonly STATUS_LABELS = STATUS_LABELS;

  // =========================================================
  // STATE
  // =========================================================

  readonly profile = signal<ClientProfile | null>(null);
  readonly requests = signal<ServiceRequest[]>([]);

  readonly loading = signal(true);
  readonly error = signal(false);

  // =========================================================
  // DERIVED STATE
  // =========================================================

  readonly firstName = computed(() => {
    const fullName = this.profile()?.fullName;

    if (!fullName) {
      return 'Cliente';
    }

    return fullName.trim().split(' ')[0];
  });

  readonly activeRequests = computed(() =>
    this.requests().filter(
      (request) =>
        request.status === ServiceRequestStatus.OPEN ||
        request.status === ServiceRequestStatus.MATCHED ||
        request.status === ServiceRequestStatus.IN_PROGRESS
    )
  );

  readonly matchedRequests = computed(() =>
    this.requests().filter(
      (request) => request.status === ServiceRequestStatus.MATCHED
    )
  );

  readonly completedRequests = computed(() =>
    this.requests().filter(
      (request) => request.status === ServiceRequestStatus.COMPLETED
    )
  );

  readonly pendingRequests = computed(() =>
    this.requests().filter(
      (request) =>
        request.status === ServiceRequestStatus.OPEN &&
        request.proposals.length > 0
    )
  );

  readonly latestRequest = computed<ServiceRequest | null>(() => {
    const allRequests = this.requests();

    if (allRequests.length === 0) {
      return null;
    }

    return [...allRequests].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  });

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.loadDashboard();
  }

  // =========================================================
  // DATA
  // =========================================================

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      profile: this.clientProfileService.getProfile(),
      requests: this.requestService.getMyRequests(),
    })
      .pipe(
        // FIX 2: takeUntilDestroyed evita actualizar estado
        // si el componente se destruye antes de la respuesta.
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: ({ profile, requests }) => {
          this.profile.set(profile);
          this.requests.set(requests);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  // =========================================================
  // LABELS
  // =========================================================

  // FIX 1: getStatusLabel eliminado. Se reemplaza por STATUS_LABELS en el template.

  // getCategoryLabel se mantiene porque hace transformacion de string,
  // no es un simple lookup. No es urgente optimizarlo.
  getCategoryLabel(category: string): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  openRequest(requestId: number): void {
    this.router.navigate(['/requests', requestId]);
  }

  createRequest(): void {
    this.router.navigate(['/requests/new']);
  }

  viewAllRequests(): void {
    this.router.navigate(['/requests/my']);
  }

  retry(): void {
    this.loadDashboard();
  }
}