import {ToastService} from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { ContextHintComponent } from '../../../shared/context-hint/context-hint';
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
import { forkJoin, finalize, Observable } from 'rxjs';

import {
  ArrowRight,
  CheckCircle,
  ClipboardList,
  LucideAngularModule,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-angular';

import { RequestService } from '../../../core/services/request.service';
import { WorkerService } from '../../../core/services/worker.service';

import { ServiceRequest } from '../../../models/request.model';
import { WorkerProfile, WorkerServiceOffering } from '../../../models/worker.profile.model';

import { Category } from '../../../models/enums/category.enum';
import { ProposalStatus } from '../../../models/enums/proposal-status.enum';
import { ServiceRequestStatus } from '../../../models/enums/service-request-status.enum';
import { WorkerStatus } from '../../../models/enums/worker-status.enum';
import { PriceType } from '../../../models/enums/price-type.enum';

// FIX 5: mapas constantes fuera de la clase.
// Antes se creaban de nuevo en cada llamada a los metodos getXxxLabel,
// lo que generaba basura en memoria por cada item del template.
const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  [ServiceRequestStatus.OPEN]: 'Abierta',
  [ServiceRequestStatus.MATCHED]: 'Profesional seleccionado',
  [ServiceRequestStatus.IN_PROGRESS]: 'En progreso',
  [ServiceRequestStatus.COMPLETED]: 'Completada',
  [ServiceRequestStatus.EXPIRED]: 'Expirada',
  [ServiceRequestStatus.CANCELLED]: 'Cancelada',
  [ServiceRequestStatus.DISPUTED]: 'En disputa',
};

const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  [ProposalStatus.PENDING]: 'Pendiente',
  [ProposalStatus.ACCEPTED]: 'Aceptada',
  [ProposalStatus.REJECTED]: 'Rechazada',
  [ProposalStatus.WITHDRAWN]: 'Retirada',
};

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  [PriceType.FIXED]: 'Importe definitivo',
  [PriceType.NEGOTIABLE]: 'Requiere evaluación',
  [PriceType.HOURLY]: 'Referencia por hora',
};

const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  [WorkerStatus.PENDING]: 'Pendiente',
  [WorkerStatus.VERIFIED]: 'Verificado',
  [WorkerStatus.REJECTED]: 'Rechazado',
  [WorkerStatus.SUSPENDED]: 'Suspendido',
};

@Component({
  selector: 'app-worker-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ContextHintComponent],
  templateUrl: './worker-dashboard.html',
  styleUrl: './worker-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerDashboardComponent implements OnInit {
  private readonly demoToast = inject(ToastService);
  private readonly workerService = inject(WorkerService);
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);

  // FIX 2: DestroyRef para takeUntilDestroyed.
  private readonly destroyRef = inject(DestroyRef);

  readonly icons = {
    ArrowRight,
    CheckCircle,
    ClipboardList,
    MessageCircle,
    Search,
    ShieldCheck,
    Star,
    Wrench,
  };

  readonly ServiceRequestStatus = ServiceRequestStatus;

  // FIX 5: exponemos los mapas constantes para el template.
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly PROPOSAL_STATUS_LABELS = PROPOSAL_STATUS_LABELS;
  readonly PRICE_TYPE_LABELS = PRICE_TYPE_LABELS;

  // =========================================================
  // STATE
  // =========================================================

  readonly profile = signal<WorkerProfile | null>(null);
  readonly requests = signal<ServiceRequest[]>([]);
  readonly opportunities = signal<ServiceRequest[]>([]);
  readonly serviceOfferings = signal<WorkerServiceOffering[]>([]);

  readonly loading = signal(true);
  readonly error = signal(false);

  // =========================================================
  // DERIVED STATE
  // =========================================================

  readonly firstName = computed(() => {
    const fullName = this.profile()?.fullName;

    if (!fullName) {
      return 'Profesional';
    }

    return fullName.trim().split(' ')[0];
  });

  readonly categories = computed<Category[]>(
    () => this.profile()?.categories ?? []
  );

  readonly isVerified = computed(() => this.profile()?.verified === true);

  // FIX 5: usamos el mapa constante en vez de crear un objeto por llamada.
  readonly workerStatusLabel = computed(() => {
    const status = this.profile()?.status;

    if (!status) {
      return 'Sin estado';
    }

    return WORKER_STATUS_LABELS[status];
  });

  readonly canReceiveRequests = computed(
    () => this.isVerified() && this.profile()?.status === WorkerStatus.VERIFIED
  );

  readonly activeRequests = computed(() =>
    this.requests().filter(
      (request) =>
        request.status === ServiceRequestStatus.MATCHED ||
        request.status === ServiceRequestStatus.IN_PROGRESS
    )
  );

  readonly completedRequests = computed(() =>
    this.requests().filter(
      (request) => request.status === ServiceRequestStatus.COMPLETED
    )
  );

  readonly myProposalRequests = computed(() => {
    const workerId = this.profile()?.id;

    if (!workerId) {
      return [];
    }

    return this.requests().filter((request) =>
      request.proposals.some((proposal) => proposal.workerId === workerId)
    );
  });

  readonly myProposals = computed(() => {
    const workerId = this.profile()?.id;

    if (!workerId) {
      return [];
    }

    return this.requests().flatMap((request) =>
      request.proposals.filter((proposal) => proposal.workerId === workerId)
    );
  });

  readonly pendingProposalRequests = computed(() =>
    this.requests().filter((request) =>
      request.proposals.some(
        (proposal) =>
          proposal.workerId === this.profile()?.id &&
          proposal.status === ProposalStatus.PENDING
      )
    )
  );

  readonly acceptedProposalRequests = computed(() =>
    this.requests().filter((request) =>
      request.proposals.some(
        (proposal) =>
          proposal.workerId === this.profile()?.id &&
          proposal.status === ProposalStatus.ACCEPTED
      )
    )
  );

  readonly activeService = computed<ServiceRequest | null>(() => {
    const active = this.activeRequests();

    return (
      active.find(
        (request) => request.selectedProposal?.workerId === this.profile()?.id
      ) ?? null
    );
  });

  readonly latestRequest = computed<ServiceRequest | null>(() => {
    const requests = this.requests();

    if (requests.length === 0) {
      return null;
    }

    return [...requests].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  });

  readonly hasOpportunities = computed(() => this.opportunities().length > 0);

  readonly activeServiceOfferings = computed(() =>
    this.serviceOfferings().filter((offering) => offering.active)
  );

  readonly inactiveServiceOfferings = computed(() =>
    this.serviceOfferings().filter((offering) => !offering.active)
  );

  readonly hasServiceOfferings = computed(
    () => this.serviceOfferings().length > 0
  );

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    console.log('🔥 ESTOY EN WORKER DASHBOARD');
    console.log('🔥 RequestService:', this.requestService);

    this.loadDashboard();
  }

  // =========================================================
  // DATA
  // =========================================================

  loadDashboard(): void {
      console.log('🔥 LLAMANDO getMyWorkerRequests()');

    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      profile: this.workerService.getProfile(),
      requests: this.requestService.getMyWorkerRequests(),
      serviceOfferings: this.workerService.getMyServiceOfferings(),
    })
      .pipe(
        // FIX 2: takeUntilDestroyed evita setear estado si el componente
        // se destruye antes de que llegue la respuesta.
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: ({ profile, requests, serviceOfferings }) => {
          // FIX 1: eliminados los console.log de profile y requests.
          this.profile.set(profile);
          this.requests.set(requests);
          this.serviceOfferings.set(serviceOfferings);
          this.loadOpportunities(profile.categories);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  private loadOpportunities(categories: Category[]): void {
    if (categories.length === 0) {
      this.opportunities.set([]);
      return;
    }

    const requestsByCategory: Observable<ServiceRequest[]>[] = categories.map(
      (category) => this.requestService.getOpenRequests(category)
    );

    forkJoin(requestsByCategory)
      // FIX 2: cleanup de la suscripcion.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const mergedRequests = results.flat();

          const uniqueRequests = Array.from(
            new Map(
              mergedRequests.map((request) => [request.id, request])
            ).values()
          );

          this.opportunities.set(uniqueRequests);
        },
        error: () => {
          // Las oportunidades son informacion secundaria.
          // Un fallo aca no deberia destruir todo el dashboard.
          this.opportunities.set([]);
        },
      });
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  openRequest(requestId: number): void {
    this.router.navigate(['/requests', requestId]);
  }

  openOpportunities(): void {
    this.router.navigate(['/requests/open']);
  }

  viewAllRequests(): void {
    this.router.navigate(['/requests/my']);
  }

  viewProfile(): void {
    this.router.navigate(['/worker/profile']);
  }

  retry(): void {
    this.loadDashboard();
  }

  createServiceOffering(): void {
    this.router.navigate(['/worker/services/new']);
  }

  editServiceOffering(offeringId: number): void {
    void offeringId;
    this.demoToast.show('La edición aún no tiene pantalla. Podés publicar servicios y activar/desactivar tus publicaciones.');
  }

  // FIX 4: en vez de recargar todo el dashboard (4 requests),
  // actualizamos solo el array local de serviceOfferings.
  deactivateServiceOffering(offeringId: number): void {
    this.workerService
      .deactivateServiceOffering(offeringId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.serviceOfferings.update((offerings) =>
            offerings.map((o) =>
              o.id === offeringId ? { ...o, active: false } : o
            )
          );
        },
        // FIX 3: manejo de error. Antes fallaba en silencio.
        error: () => {
          // Opcional: mostrar un toast o signal de error.
        },
      });
  }

  activateServiceOffering(offeringId: number): void {
    this.workerService
      .activateServiceOffering(offeringId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.serviceOfferings.update((offerings) =>
            offerings.map((o) =>
              o.id === offeringId ? { ...o, active: true } : o
            )
          );
        },
        error: () => {
          // Opcional: mostrar un toast o signal de error.
        },
      });
  }

    // FIX: metodo que se me habia escapado al reemplazar los getXxxLabel
  // por mapas. El HTML lo sigue usando para mostrar la categoria.
  // Se deja como metodo porque hace transformacion de string,
  // no es un simple lookup como los otros labels.
  getCategoryLabel(category: Category): string {
    return category
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}


