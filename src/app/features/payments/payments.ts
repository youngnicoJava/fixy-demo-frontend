import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { ContractPaymentItem } from '../../models/payment.model';
import { Role } from '../../models/enums/Role.enum';
export type PaymentSection = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED';
export function paymentSection(item: ContractPaymentItem): PaymentSection {
  return item.payment?.status === 'FAILED' ? 'PENDING' : (item.payment?.status ?? 'PENDING');
}
@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payments.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsComponent implements OnInit {
  private readonly service = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<ContractPaymentItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly paying = signal<number | null>(null);
  readonly client = computed(() => this.auth.currentUser()?.role === Role.CLIENT);
  readonly section = signal<PaymentSection>('PENDING');
  readonly visible = computed(() =>
    this.items().filter((item) => paymentSection(item) === this.section()),
  );
  readonly sections: { key: PaymentSection; label: string }[] = [
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'HELD', label: 'Protegidos' },
    { key: 'RELEASED', label: 'Finalizados' },
    { key: 'REFUNDED', label: 'Reembolsados' },
  ];
  ngOnInit() {
    const reference = this.route.snapshot.queryParamMap.get('external_reference');
    // Return parameters are hints only; the backend validates ownership and provider evidence.
    if (
      isPlatformBrowser(this.platformId) &&
      this.client() &&
      reference &&
      /^[1-9]\d{0,14}$/.test(reference)
    ) {
      this.service
        .synchronize(Number(reference))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.load(),
          error: (error) => {
            this.load();
            this.error.set(this.message(error));
          },
        });
    } else this.load();
  }
  load() {
    if (!this.client()) {
      this.loading.set(false);
      this.error.set(
        'Esta área corresponde a los pagos de clientes. Podés ver los pagos de tus trabajos desde cada contratación.',
      );
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.service
      .getMyPayments()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error) => this.error.set(this.message(error)),
      });
  }
  pay(item: ContractPaymentItem) {
    if (this.paying() !== null || paymentSection(item) !== 'PENDING' || !item.agreementId) return;
    this.paying.set(item.serviceRequestId);
    this.error.set(null);
    this.service
      .startCheckout(item.serviceRequestId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.paying.set(null)),
      )
      .subscribe({
        next: (payment) => {
          if (payment.status !== 'PENDING') {
            this.section.set('HELD');
            this.load();
          }
        },
        error: (error) => this.error.set(this.message(error)),
      });
  }
  private message(error: unknown) {
    return error instanceof HttpErrorResponse
      ? (error.error?.message ?? 'No pudimos cargar los pagos.')
      : error instanceof Error
        ? error.message
        : 'No pudimos iniciar el pago.';
  }
}
