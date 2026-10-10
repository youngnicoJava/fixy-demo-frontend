import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  finalize,
  forkJoin,
  Observable,
  of,
  Subscription,
  Subject,
  takeUntil,
  throwError,
} from 'rxjs';
import { ContractService } from '../../core/services/contract.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { ContractSummary } from '../../models/contract.model';
import { PaymentResponse } from '../../models/payment.model';
import { ContextHintComponent } from '../context-hint/context-hint';
import { ReviewService } from '../../core/services/review.service';
import { DisputeService } from '../../core/services/dispute.service';
import { ReviewResponse } from '../../models/review.model';
import { DisputeResponse } from '../../models/dispute.model';
import { DisputeReason } from '../../models/enums/dispute-reason.enum';
import { ServiceRequestStatus } from '../../models/enums/service-request-status.enum';
import { PaymentStatus } from '../../models/enums/payment-status.enum';
@Component({
  selector: 'app-contract-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ContextHintComponent],
  templateUrl: './contract-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPanelComponent implements OnChanges {
  @Input({ required: true }) requestId!: number;
  @Input() compact = false;
  @Input() requestStatus?: ServiceRequestStatus;
  @Output() changed = new EventEmitter<void>();
  @Output() paymentConfirmed = new EventEmitter<boolean>();
  private readonly contracts = inject(ContractService);
  private readonly reviews = inject(ReviewService);
  private readonly disputes = inject(DisputeService);
  private readonly payments = inject(PaymentService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private loadSubscription: Subscription | null = null;
  private version = 0;
  private readonly contextChanged = new Subject<void>();
  readonly summary = signal<ContractSummary | null>(null);
  readonly review = signal<ReviewResponse | null>(null);
  readonly dispute = signal<DisputeResponse | null>(null);
  readonly aftercareLoading = signal(false);
  readonly reviewForm = this.fb.nonNullable.group({
    rating: [5, [Validators.min(1), Validators.max(5)]],
    comment: ['', Validators.maxLength(300)],
  });
  readonly claimForm = this.fb.nonNullable.group({
    reason: [DisputeReason.POOR_QUALITY, Validators.required],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });
  readonly claimReasons = [
    { value: DisputeReason.POOR_QUALITY, label: 'Trabajo defectuoso' },
    { value: DisputeReason.WORK_NOT_COMPLETED, label: 'Incumplimiento' },
    { value: DisputeReason.DAMAGE, label: 'Daños' },
    { value: DisputeReason.OTHER, label: 'Otro problema relevante' },
  ];
  readonly payment = signal<PaymentResponse | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly showQuoteForm = signal(false);
  readonly isClient = computed(() => this.summary()?.clientId === this.auth.currentUser()?.id);
  readonly isWorker = computed(() => this.summary()?.workerUserId === this.auth.currentUser()?.id);
  readonly canQuote = computed(
    () =>
      ['MATCHED', 'IN_PROGRESS'].includes(this.summary()?.agreement?.status ?? 'MATCHED') &&
      this.isWorker() &&
      !this.summary()?.agreement &&
      (!this.summary()?.visit || this.summary()?.visit?.status === 'COMPLETED'),
  );
  readonly canPay = computed(
    () =>
      ['MATCHED', 'IN_PROGRESS'].includes(this.summary()?.agreement?.status ?? '') &&
      this.isClient() &&
      !!this.summary()?.agreement &&
      (!this.payment() ||
        this.payment()?.status === 'PENDING' ||
        this.payment()?.status === 'FAILED'),
  );
  readonly quoteForm = this.fb.nonNullable.group({
    laborAmount: [
      0,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    ],
    materialsAmount: [
      0,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    ],
    scope: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  private readonly quoteValue = toSignal(this.quoteForm.valueChanges, {
    initialValue: this.quoteForm.getRawValue(),
  });
  readonly quoteTotal = computed(
    () =>
      Number(this.quoteValue().laborAmount ?? 0) + Number(this.quoteValue().materialsAmount ?? 0),
  );
  readonly visitForm = this.fb.nonNullable.group({
    price: [0, [Validators.min(0)]],
    scheduledAt: ['', Validators.required],
    notes: ['', Validators.maxLength(1000)],
  });
  ngOnChanges() {
    this.reload();
  }
  reload() {
    this.loadSubscription?.unsubscribe();
    const version = ++this.version;
    this.contextChanged.next();
    this.aftercareLoading.set(false);
    this.showQuoteForm.set(false);
    this.summary.set(null);
    this.payment.set(null);
    this.review.set(null);
    this.dispute.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.busy.set(false);
    this.paymentConfirmed.emit(false);
    if (!Number.isInteger(this.requestId) || this.requestId <= 0) {
      this.loading.set(false);
      return;
    }
    this.loadSubscription = forkJoin({
      summary: this.contracts.get(this.requestId),
      payment: this.payments
        .getByRequest(this.requestId)
        .pipe(
          catchError((error: unknown) =>
            error instanceof HttpErrorResponse && error.status === 404
              ? of(null)
              : throwError(() => error),
          ),
        ),
    })
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (version !== this.version) return;
          this.summary.set(result.summary);
          this.payment.set(result.payment);
          this.paymentConfirmed.emit(result.payment?.status === PaymentStatus.HELD);
          if (!this.compact && result.summary.agreement) this.loadAftercare(version);
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  sendQuote() {
    if (this.quoteForm.invalid || this.quoteTotal() <= 0 || !this.canQuote()) return;
    this.run(this.contracts.sendQuote(this.requestId, this.quoteForm.getRawValue()));
  }
  decide(id: number, accept: boolean) {
    if (!this.isClient()) return;
    this.run(this.contracts.decideQuote(this.requestId, id, accept));
  }
  private run(operation: Observable<ContractSummary>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const version = this.version;
    operation
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (summary) => {
          if (version !== this.version) return;
          this.summary.set(summary);
          this.showQuoteForm.set(false);
          this.changed.emit();
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  private loadAftercare(version: number) {
    this.aftercareLoading.set(true);
    forkJoin({
      review: this.reviews.getByRequest(this.requestId),
      dispute: this.disputes.getDisputeByRequest(this.requestId),
    })
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.aftercareLoading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (version !== this.version) return;
          this.review.set(result.review);
          this.dispute.set(result.dispute);
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  canClaim() {
    const status = this.summary()?.agreement?.status;
    return (
      !this.compact &&
      !this.aftercareLoading() &&
      !this.dispute() &&
      this.payment()?.status === PaymentStatus.HELD &&
      (status === 'IN_PROGRESS' || status === 'COMPLETED') &&
      (!this.payment()?.protectionEndsAt ||
        new Date(this.payment()!.protectionEndsAt!).getTime() > Date.now())
    );
  }
  sendReview() {
    if (!this.isClient() || this.review() || this.reviewForm.invalid || this.busy()) return;
    this.busy.set(true);
    const version = this.version;
    this.reviews
      .createReview(this.requestId, this.reviewForm.getRawValue())
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (review) => {
          if (version !== this.version) return;
          this.review.set(review);
          this.changed.emit();
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  sendClaim() {
    if (!this.canClaim() || this.claimForm.invalid || this.busy()) return;
    this.busy.set(true);
    const version = this.version;
    this.disputes
      .openDispute(this.requestId, this.claimForm.getRawValue())
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (dispute) => {
          if (version !== this.version) return;
          this.dispute.set(dispute);
          this.changed.emit();
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  pay() {
    if (!this.canPay() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const version = this.version;
    this.payments
      .startCheckout(this.requestId)
      .pipe(
        takeUntil(this.contextChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.version) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (payment) => {
          if (version === this.version && payment.status !== 'PENDING') {
            this.payment.set(payment);
            this.changed.emit();
          }
        },
        error: (error) => {
          if (version === this.version) this.error.set(this.message(error));
        },
      });
  }
  scheduleVisit() {
    if (this.visitForm.invalid || !this.isWorker()) return;
    const input = this.visitForm.getRawValue();
    const date = new Date(input.scheduledAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      this.error.set('Elegí una fecha futura para la visita.');
      return;
    }
    this.run(
      this.contracts.scheduleVisit(this.requestId, { ...input, scheduledAt: date.toISOString() }),
    );
  }
  completeVisit() {
    this.run(this.contracts.completeVisit(this.requestId));
  }
  visitDue(date: string | null) {
    return !!date && new Date(date).getTime() <= Date.now();
  }
  protectionDays(seconds: number) {
    return seconds / 86400;
  }
  quoteLabel(status: string) {
    return (
      (
        {
          SENT: 'Pendiente de aceptación',
          ACCEPTED: 'Aceptado',
          REJECTED: 'Rechazado',
          SUPERSEDED: 'Reemplazado por una revisión',
        } as Record<string, string>
      )[status] ?? status
    );
  }
  paymentLabel(status: PaymentStatus) {
    return (
      {
        PENDING: 'Pendiente',
        HELD: 'Protegido por Fixy',
        RELEASED: 'Liquidado al profesional',
        FAILED: 'No confirmado',
        REFUNDED: 'Reembolsado',
      } as Record<PaymentStatus, string>
    )[status];
  }
  private message(error: unknown) {
    return error instanceof HttpErrorResponse
      ? (error.error?.message ?? 'No pudimos cargar la contratación.')
      : error instanceof Error
        ? error.message
        : 'No pudimos completar la operación.';
  }
}
