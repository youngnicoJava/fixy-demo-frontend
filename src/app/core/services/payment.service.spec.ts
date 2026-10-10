import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';

describe('Payment checkout recovery', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('returns verified HELD without demanding or opening a checkout URL', () => {
    let status: string | undefined;
    TestBed.inject(PaymentService)
      .startCheckout(403)
      .subscribe((p) => (status = p.status));
    const request = TestBed.inject(HttpTestingController).expectOne(
      environment.apiUrl + '/payments',
    );
    expect(request.request.body).toEqual({ serviceRequestId: 403 });
    request.flush({ id: 3, status: 'HELD', checkoutUrl: null });
    expect(status).toBe('HELD');
  });
  it('propagates anomaly conflicts without attempting a second checkout', () => {
    let errorStatus: number | undefined;
    TestBed.inject(PaymentService)
      .startCheckout(403)
      .subscribe({ error: (e) => (errorStatus = e.status) });
    TestBed.inject(HttpTestingController)
      .expectOne(environment.apiUrl + '/payments')
      .flush({ message: 'MULTIPLE_PROVIDER_PAYMENTS' }, { status: 409, statusText: 'Conflict' });
    expect(errorStatus).toBe(409);
  });
});
