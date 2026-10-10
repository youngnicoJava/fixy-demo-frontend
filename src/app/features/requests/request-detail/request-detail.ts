import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractPanelComponent } from '../../../shared/contract-panel/contract-panel';
import { ActivatedRoute, Router } from '@angular/router';
import {
  finalize,
  Observable,
  Subject,
  Subscription,
  takeUntil,
  map,
  distinctUntilChanged,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock3,
  MapPin,
  MessageCircle,
  Send,
  Star,
  User,
  XCircle,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';

import {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestCommentRequest,
} from '../../../models/request.model';

import { WorkerService } from '../../../core/services/worker.service';
import { Role } from '../../../models/enums/Role.enum';
import { ServiceRequestStatus } from '../../../models/enums/service-request-status.enum';
import { ProposalStatus } from '../../../models/enums/proposal-status.enum';
import { PriceType } from '../../../models/enums/price-type.enum';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ContractPanelComponent],
  templateUrl: './request-detail.html',
  styleUrl: './request-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeChanged = new Subject<void>();
  private requestLoad: Subscription | null = null;
  private commentsLoad: Subscription | null = null;
  private readonly router = inject(Router);
  private readonly requestService = inject(RequestService);
  private readonly authService = inject(AuthService);
  private readonly workerService = inject(WorkerService);
  private readonly conversationService = inject(ConversationService);

  readonly icons = {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    Clock3,
    MapPin,
    MessageCircle,
    Send,
    Star,
    User,
    XCircle,
  };

  readonly ProposalStatus = ProposalStatus;
  readonly PriceType = PriceType;

  // =========================================================
  // STATE
  // =========================================================

  readonly request = signal<ServiceRequest | null>(null);

  readonly loading = signal(true);
  readonly error = signal(false);

  readonly actionLoading = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly currentUser = computed(() => this.authService.getCurrentUser());

  readonly currentUserRole = computed(() => this.currentUser()?.role ?? null);

  readonly currentWorkerId = signal<number | null>(null);

  readonly replyingTo = signal<number | null>(null);

  // =========================================================
  // COMMENTS STATE
  // =========================================================

  readonly comments = signal<ServiceRequestComment[]>([]);
  readonly commentsLoading = signal(false);
  readonly commentsError = signal<string | null>(null);

  readonly newComment = signal('');
  readonly commentSubmitting = signal(false);

  // =========================================================
  // DERIVED
  // =========================================================

  readonly isClient = computed(() => this.currentUserRole() === Role.CLIENT);

  readonly isWorker = computed(() => this.currentUserRole() === Role.WORKER);

  readonly requestStatus = computed(() => this.request()?.status ?? null);

  readonly isOpen = computed(() => this.requestStatus() === ServiceRequestStatus.OPEN);

  readonly isMatched = computed(() => this.requestStatus() === ServiceRequestStatus.MATCHED);

  readonly isInProgress = computed(() => this.requestStatus() === ServiceRequestStatus.IN_PROGRESS);

  readonly isCompleted = computed(() => this.requestStatus() === ServiceRequestStatus.COMPLETED);

  readonly isCancelled = computed(() => this.requestStatus() === ServiceRequestStatus.CANCELLED);

  readonly isExpired = computed(() => this.requestStatus() === ServiceRequestStatus.EXPIRED);

  readonly isDisputed = computed(() => this.requestStatus() === ServiceRequestStatus.DISPUTED);

  readonly selectedProposal = computed(() => this.request()?.selectedProposal ?? null);

  readonly myProposal = computed(() => {
    const request = this.request();
    const workerId = this.currentWorkerId();

    if (!request || !workerId) {
      return null;
    }

    return request.proposals.find((proposal) => proposal.workerId === workerId) ?? null;
  });

  readonly canCancel = computed(
    () => this.isClient() && this.requestStatus() === ServiceRequestStatus.OPEN,
  );

  readonly canSelectProposal = computed(
    () =>
      this.isClient() &&
      this.requestStatus() === ServiceRequestStatus.OPEN &&
      this.request()?.proposals.some((proposal) => proposal.status === ProposalStatus.PENDING) ===
        true,
  );

  readonly canCreateProposal = computed(
    () =>
      this.isWorker() &&
      this.requestStatus() === ServiceRequestStatus.OPEN &&
      this.myProposal() === null,
  );

  readonly canWithdrawProposal = computed(
    () =>
      this.isWorker() &&
      this.requestStatus() === ServiceRequestStatus.OPEN &&
      this.myProposal()?.status === ProposalStatus.PENDING,
  );

  readonly canStartService = computed(
    () =>
      this.isWorker() &&
      this.requestStatus() === ServiceRequestStatus.MATCHED &&
      this.paymentHeld() &&
      this.selectedProposal()?.workerId === this.currentWorkerId(),
  );

  readonly canCompleteService = computed(
    () => this.isClient() && this.requestStatus() === ServiceRequestStatus.IN_PROGRESS && this.paymentHeld(),
  );

  readonly canComment = computed(() => this.isOpen() && (this.isClient() || this.isWorker()));

  readonly showSelectedWorker = computed(() => this.selectedProposal() !== null);

  // =========================================================
  // FORM STATE
  // =========================================================

  readonly proposalMessage = signal('');
  readonly proposalPrice = signal<number | null>(null);
  readonly proposalPriceType = signal<PriceType>(PriceType.NEGOTIABLE);
  readonly requiresVisit = signal(false);
  readonly paymentHeld = signal(false);

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.resolveCurrentWorker();
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.routeChanged.next();
        this.request.set(null);
        this.comments.set([]);
        this.paymentHeld.set(false);
        this.actionLoading.set(false);
        this.loadRequest();
      });
  }

  // =========================================================
  // LOAD
  // =========================================================

  loadRequest(): void {
    this.requestLoad?.unsubscribe();
    const requestId = Number(this.route.snapshot.paramMap.get('id'));

    if (!requestId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.requestLoad = this.requestService
      .getRequestById(requestId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .pipe(takeUntil(this.routeChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (request) => {
          this.request.set(request);
          this.loadComments(request.id);
        },
        error: () => {
          this.error.set(true);
        },
      });
  }

  private resolveCurrentWorker(): void {
    if (!this.isWorker()) {
      return;
    }

    this.workerService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.currentWorkerId.set(profile.id);
        },
      });
  }

  // =========================================================
  // COMMENTS
  // =========================================================

  private loadComments(requestId: number): void {
    this.commentsLoad?.unsubscribe();
    this.commentsLoading.set(true);
    this.commentsError.set(null);

    this.commentsLoad = this.requestService
      .getRequestComments(requestId)
      .pipe(
        finalize(() => {
          this.commentsLoading.set(false);
        }),
      )
      .pipe(takeUntil(this.routeChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => {
          this.comments.set(comments);
        },
        error: () => {
          this.commentsError.set('No se pudieron cargar los comentarios.');
        },
      });
  }

  submitComment(): void {
    const request = this.request();
    const content = this.newComment().trim();

    if (!request || !this.canComment() || !content) {
      return;
    }

    const commentRequest: ServiceRequestCommentRequest = {
      content,
      parentCommentId: this.replyingTo(),
    };

    this.commentSubmitting.set(true);
    this.commentsError.set(null);

    this.requestService
      .addRequestComment(request.id, commentRequest)
      .pipe(
        finalize(() => {
          this.commentSubmitting.set(false);
        }),
      )
      .pipe(takeUntil(this.routeChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.comments.update((comments) => [...comments, comment]);
          this.newComment.set('');
          this.replyingTo.set(null);
        },
        error: (error: unknown) => {
          this.commentsError.set(this.getErrorMessage(error));
        },
      });
  }

  onCommentInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;

    this.newComment.set(el.value);

    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  startReply(commentId: number): void {
    this.replyingTo.set(commentId);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  // =========================================================
  // CLIENT ACTIONS
  // =========================================================

  selectProposal(proposalId: number): void {
    const request = this.request();

    if (!request || !this.canSelectProposal()) {
      return;
    }

    this.executeAction(
      () => this.requestService.selectProposal(request.id, proposalId),
      (updatedRequest) => {
        this.request.set(updatedRequest);
      },
    );
  }

  cancelRequest(): void {
    const request = this.request();

    if (!request || !this.canCancel()) {
      return;
    }

    const confirmed = window.confirm('¿Seguro que querés cancelar esta solicitud?');

    if (!confirmed) {
      return;
    }

    this.executeAction(
      () => this.requestService.cancelRequest(request.id),
      (updatedRequest) => {
        this.request.set(updatedRequest);
      },
    );
  }

  completeRequest(): void {
    const request = this.request();

    if (!request || !this.canCompleteService()) {
      return;
    }

    const confirmed = window.confirm('¿Confirmás que el servicio fue completado?');

    if (!confirmed) {
      return;
    }

    this.executeAction(
      () => this.requestService.completeRequest(request.id),
      (updatedRequest) => {
        this.request.set(updatedRequest);
      },
    );
  }

  readonly canOpenChat = computed(
    () =>
      (this.isMatched() || this.isInProgress() || this.isCompleted() || this.isDisputed()) &&
      this.selectedProposal() !== null,
  );

  // =========================================================
  // WORKER ACTIONS
  // =========================================================

  submitProposal(): void {
    const request = this.request();
    const message = this.proposalMessage().trim();
    const price = this.proposalPrice();

    if (!request || !this.canCreateProposal()) {
      return;
    }

    if (
      !message ||
      (this.proposalPriceType() === PriceType.FIXED && (!price || price <= 0)) ||
      (price !== null && price < 0)
    ) {
      this.actionError.set('Completá el alcance y, si es definitivo, un importe total válido.');
      return;
    }

    this.executeAction(
      () =>
        this.requestService.createProposal(request.id, {
          message,
          estimatedPrice: price ?? 0,
          priceType: this.proposalPriceType(),
          requiresVisit: this.requiresVisit(),
        }),
      () => {
        this.proposalMessage.set('');
        this.proposalPrice.set(null);
        this.loadRequest();
      },
    );
  }

  withdrawProposal(): void {
    const request = this.request();
    const proposal = this.myProposal();

    if (!request || !proposal || !this.canWithdrawProposal()) {
      return;
    }

    this.executeAction(
      () => this.requestService.withdrawProposal(request.id, proposal.id),
      () => {
        this.loadRequest();
      },
    );
  }

  startService(): void {
    const request = this.request();

    if (!request || !this.canStartService()) {
      return;
    }

    this.executeAction(
      () => this.requestService.startRequest(request.id),
      (updatedRequest) => {
        this.request.set(updatedRequest);
      },
    );
  }

  // =========================================================
  // ACTION EXECUTION
  // =========================================================

  private executeAction<T>(action: () => Observable<T>, onSuccess?: (result: T) => void): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.actionError.set(null);

    action()
      .pipe(finalize(() => this.actionLoading.set(false)))
      .pipe(takeUntil(this.routeChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => onSuccess?.(result),
        error: (error: unknown) => {
          this.actionError.set(this.getErrorMessage(error));
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    const err = error as { error?: { message?: string }; message?: string };

    return err?.error?.message ?? err?.message ?? 'No pudimos completar la operación.';
  }

  // =========================================================
  // LABELS
  // =========================================================

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

  getProposalStatusLabel(status: ProposalStatus): string {
    const labels: Record<ProposalStatus, string> = {
      [ProposalStatus.PENDING]: 'Pendiente',
      [ProposalStatus.ACCEPTED]: 'Aceptada',
      [ProposalStatus.REJECTED]: 'Rechazada',
      [ProposalStatus.WITHDRAWN]: 'Retirada',
    };

    return labels[status];
  }

  getPriceTypeLabel(priceType: PriceType): string {
    const labels: Record<PriceType, string> = {
      [PriceType.FIXED]: 'Importe total definitivo',
      [PriceType.NEGOTIABLE]: 'Requiere presupuesto',
      [PriceType.HOURLY]: 'Referencia por hora; requiere presupuesto total',
    };

    return labels[priceType];
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
      timeStyle: 'short',
    }).format(new Date(value));
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  goBack(): void {
    this.router.navigate(['/requests/my']);
  }

  openChat(): void {
    const requestId = this.request()?.id;

    if (!requestId) {
      return;
    }

    this.actionLoading.set(true);
    this.actionError.set(null);

    this.conversationService
      .getConversationByRequest(requestId)
      .pipe(
        finalize(() => {
          this.actionLoading.set(false);
        }),
      )
      .pipe(takeUntil(this.routeChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversation) => {
          this.router.navigate(['/conversations', conversation.id]);
        },
        error: (error: unknown) => {
          this.actionError.set(this.getErrorMessage(error));
        },
      });
  }

  // =========================================================
  // TRACKING
  // =========================================================

  trackByProposalId(_: number, proposal: ServiceRequest['proposals'][number]): number {
    return proposal.id;
  }

  trackByEventId(_: number, event: ServiceRequest['events'][number]): number {
    return event.id;
  }

  trackByCommentId(_: number, comment: ServiceRequestComment): number {
    return comment.id;
  }
}
