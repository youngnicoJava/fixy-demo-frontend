import { DemoConfirm } from '../../demo/demo-confirm';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, of, from, throwError } from 'rxjs';
import { DemoStore } from '../../demo/demo-store';

import { ContractPaymentItem } from '../../models/payment.model';

import { CreatePaymentRequest, PaymentResponse } from '../../models/payment.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/payments`;

  private readonly confirmation = inject(DemoConfirm);
  private readonly demo = inject(DemoStore);
  getByRequest(id: number) {
    return this.http.get<PaymentResponse | null>(this.apiUrl + '/request/' + id);
  }
  synchronize(paymentId: number) {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/${paymentId}/synchronize`, null);
  }
  getMyPayments() {
    return this.http.get<ContractPaymentItem[]>(this.apiUrl + '/my');
  }
  startCheckout(id: number) {
    return this.createPayment({ serviceRequestId: id }).pipe(
      switchMap((payment) => {
        if (payment.status !== 'PENDING') return of(payment);
        return from(
          this.confirmation.ask(
            'Confirmar pago SIMULADO. No se cobrará dinero ni se abrirá Mercado Pago.',
          ),
        ).pipe(
          switchMap((accepted) =>
            accepted
              ? from(this.demo.confirmPayment(id))
              : throwError(
                  () => new Error('Pago simulado cancelado. Podés retomarlo desde Pagos.'),
                ),
          ),
        );
      }),
    );
  } // CLIENT — crear pago
  createPayment(request: CreatePaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(this.apiUrl, request);
  }

  // CLIENT — liberar pago
  releasePayment(serviceRequestId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${serviceRequestId}/release`, null);
  }
}
