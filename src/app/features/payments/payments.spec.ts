import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaymentsComponent } from './payments';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { Role } from '../../models/enums/Role.enum';
import { PaymentStatus } from '../../models/enums/payment-status.enum';
describe('Payments area', () => {
  it('lists unpaid agreements, maps HELD independently of completion and retries the same request', () => {
    TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ id: 1, role: Role.CLIENT }) } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const pending = {
      agreementId: 8,
      serviceRequestId: 10,
      title: 'Presupuesto aceptado',
      workerName: 'Profesional',
      totalAmount: 155,
      payment: null,
    };
    http.expectOne(environment.apiUrl + '/payments/my').flush([
      pending,
      {
        ...pending,
        agreementId: 9,
        serviceRequestId: 11,
        title: 'Trabajo completado, aún protegido',
        payment: {
          id: 4,
          serviceRequestId: 11,
          amount: 155,
          feeAmount: 13.95,
          status: PaymentStatus.HELD,
          checkoutUrl: null,
          agreementId: 9,
          protectionEndsAt: '2026-10-07T00:00:00Z',
          heldAt: '2026-10-04T00:00:00Z',
          settledAt: null,
        },
      },
    ]);
    expect(fixture.componentInstance.visible()).toEqual([pending]);
    fixture.componentInstance.section.set('HELD');
    expect(fixture.componentInstance.visible()[0].title).toContain('aún protegido');
    fixture.componentInstance.section.set('PENDING');
    fixture.componentInstance.pay(pending);
    fixture.componentInstance.pay(pending);
    const request = http.expectOne(environment.apiUrl + '/payments');
    expect(request.request.body).toEqual({ serviceRequestId: 10 });
    request.flush(
      { message: 'Proveedor no disponible' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    expect(fixture.componentInstance.paying()).toBeNull();
    expect(fixture.componentInstance.error()).toBe('Proveedor no disponible');
    http.verify();
    fixture.destroy();
  });
  it('treats Checkout return parameters as hints and waits for verified synchronization', () => {
    TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                external_reference: '3',
                status: 'approved',
                payment_id: 'arbitrary',
              }),
            },
          },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1, role: Role.CLIENT }) } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual([]);
    const sync = http.expectOne(environment.apiUrl + '/payments/3/synchronize');
    expect(sync.request.method).toBe('POST');
    expect(sync.request.body).toBeNull();
    sync.flush({ message: 'MULTIPLE_PROVIDER_PAYMENTS' }, { status: 409, statusText: 'Conflict' });
    http.expectOne(environment.apiUrl + '/payments/my').flush([]);
    expect(fixture.componentInstance.error()).toBe('MULTIPLE_PROVIDER_PAYMENTS');
    http.verify();
    fixture.destroy();
  });
  it('does not execute financial synchronization during SSR', () => {
    TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ external_reference: '3' }) } },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1, role: Role.CLIENT }) } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectNone(environment.apiUrl + '/payments/3/synchronize');
    http.expectOne(environment.apiUrl + '/payments/my').flush([]);
    http.verify();
    fixture.destroy();
  });
});
