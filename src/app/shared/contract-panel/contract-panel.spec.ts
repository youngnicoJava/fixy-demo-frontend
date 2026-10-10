import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ContractPanelComponent } from './contract-panel';
import { AuthService } from '../../core/services/auth.service';
import { ContractSummary } from '../../models/contract.model';
import { environment } from '../../../environments/environment';
import { ServiceRequestStatus } from '../../models/enums/service-request-status.enum';
import { PaymentStatus } from '../../models/enums/payment-status.enum';

describe('ContractPanel', () => {
  let fixture: ComponentFixture<ContractPanelComponent>;
  let http: HttpTestingController;
  const user = signal({ id: 1 });
  const url = environment.apiUrl;
  const summary: ContractSummary = {
    serviceRequestId: 10,
    title: 'Reparación',
    clientId: 1,
    workerUserId: 2,
    workerName: 'Profesional',
    agreement: null,
    visit: null,
    quotes: [
      {
        id: 5,
        revision: 1,
        workerId: 22,
        laborAmount: 120,
        materialsAmount: 35,
        totalAmount: 155,
        scope: 'Cambio de caño',
        status: 'SENT',
        createdAt: '2026-10-04T00:00:00Z',
        decidedAt: null,
      },
    ],
  };
  beforeEach(() => {
    user.set({ id: 1 });
    TestBed.configureTestingModule({
      imports: [ContractPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    });
    fixture = TestBed.createComponent(ContractPanelComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('requestId', 10);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });
  function load(data = summary) {
    http.expectOne(url + '/requests/10/contract').flush(data);
    http
      .expectOne(url + '/payments/request/10')
      .flush({ message: 'No payment' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  }
  it('shows a structured quote and accepts it without posting chat text', () => {
    load();
    expect(fixture.nativeElement.textContent).toContain('Cambio de caño');
    const panel = fixture.componentInstance;
    panel.decide(5, true);
    const request = http.expectOne(url + '/requests/10/contract/quotes/5/accept');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      ...summary,
      quotes: [{ ...summary.quotes[0], status: 'ACCEPTED' }],
      agreement: {
        id: 8,
        quoteId: 5,
        clientId: 1,
        workerId: 22,
        totalAmount: 155,
        scope: 'Cambio de caño',
        protectionPeriodSeconds: 259200,
        acceptedAt: '2026-10-04T00:00:00Z',
        status: 'MATCHED',
      },
    });
    expect(panel.canPay()).toBe(true);
    expect(panel.canQuote()).toBe(false);
  });
  it('worker sends amounts and scope instead of interpreting a message', () => {
    user.set({ id: 2 });
    load();
    const panel = fixture.componentInstance;
    panel.quoteForm.setValue({ laborAmount: 120, materialsAmount: 35, scope: 'Trabajo completo' });
    expect(panel.quoteTotal()).toBe(155);
    panel.sendQuote();
    panel.sendQuote();
    const request = http.expectOne(url + '/requests/10/contract/quotes');
    expect(request.request.body).toEqual({
      laborAmount: 120,
      materialsAmount: 35,
      scope: 'Trabajo completo',
    });
    request.flush(summary);
  });
  it('blocks invalid precision and zero total before HTTP', () => {
    user.set({ id: 2 });
    load();
    const panel = fixture.componentInstance;
    panel.quoteForm.setValue({ laborAmount: 0, materialsAmount: 0, scope: 'Trabajo' });
    panel.sendQuote();
    panel.quoteForm.controls.laborAmount.setValue(1.123);
    panel.sendQuote();
    http.expectNone(url + '/requests/10/contract/quotes');
  });
  it('cancelled previous loads cannot replace a new request context', () => {
    const old = http.expectOne(url + '/requests/10/contract');
    http.expectOne(url + '/payments/request/10');
    fixture.componentRef.setInput('requestId', 11);
    fixture.detectChanges();
    expect(old.cancelled).toBe(true);
    http
      .expectOne(url + '/requests/11/contract')
      .flush({ ...summary, serviceRequestId: 11, title: 'Nueva contratación' });
    http
      .expectOne(url + '/payments/request/11')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.summary()?.serviceRequestId).toBe(11);
  });
  it('emits confirmed payment only for HELD and preserves protection deadline', () => {
    const confirmed = vi.spyOn(fixture.componentInstance.paymentConfirmed, 'emit');
    http.expectOne(url + '/requests/10/contract').flush(summary);
    http.expectOne(url + '/payments/request/10').flush({
      id: 9,
      serviceRequestId: 10,
      amount: 155,
      feeAmount: 13.95,
      status: PaymentStatus.HELD,
      checkoutUrl: null,
      agreementId: 8,
      protectionEndsAt: '2026-10-07T00:00:00Z',
      heldAt: '2026-10-04T00:00:00Z',
      settledAt: null,
    });
    expect(confirmed).toHaveBeenCalledWith(true);
    expect(fixture.componentInstance.payment()?.protectionEndsAt).toBe('2026-10-07T00:00:00Z');
  });
  it('does not silently treat a forbidden payment as no payment', () => {
    http.expectOne(url + '/requests/10/contract').flush(summary);
    http
      .expectOne(url + '/payments/request/10')
      .flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
    expect(fixture.componentInstance.error()).toBe('No autorizado');
    expect(fixture.componentInstance.canPay()).toBe(false);
  });
  function completed(protectionEndsAt: string, failure?: { resource: string; status: number }) {
    http.expectOne(url + '/requests/10/contract').flush({
      ...summary,
      agreement: {
        id: 8,
        quoteId: 5,
        clientId: 1,
        workerId: 22,
        totalAmount: 155,
        scope: 'Cambio de caño',
        protectionPeriodSeconds: 259200,
        acceptedAt: '2026-10-04T00:00:00Z',
        status: 'COMPLETED',
      },
    });
    http.expectOne(url + '/payments/request/10').flush({
      id: 9,
      serviceRequestId: 10,
      amount: 155,
      feeAmount: 13.95,
      status: PaymentStatus.HELD,
      checkoutUrl: null,
      agreementId: 8,
      protectionEndsAt,
      heldAt: '2026-10-04T00:00:00Z',
      settledAt: null,
    });
    for (const resource of ['reviews', 'disputes']) {
      const response = http.expectOne(url + '/' + resource + '/requests/10');
      if (failure?.resource === resource) response.flush({ message: 'Real backend failure' }, { status: failure.status, statusText: 'Error' });
      else if (!response.cancelled) response.flush(null, { status: 204, statusText: 'No Content' });
    }
    fixture.detectChanges();
  }
  it('completion permits a review while funds remain protected', () => {
    completed(new Date(Date.now() + 86400000).toISOString());
    expect(fixture.nativeElement.textContent).toContain('Valorar el trabajo');
    expect(fixture.componentInstance.canPay()).toBe(false);
    fixture.componentInstance.sendReview();
    fixture.componentInstance.sendReview();
    const post = http.expectOne(url + '/reviews/requests/10');
    expect(post.request.method).toBe('POST');
    post.flush({ id: 12, rating: 5, comment: '', createdAt: '2026-10-04T00:00:00Z' });
    expect(fixture.componentInstance.payment()?.status).toBe(PaymentStatus.HELD);
  });
  it('the claim CTA closes when the protection deadline has elapsed', () => {
    completed(new Date(Date.now() - 1000).toISOString());
    expect(fixture.componentInstance.canClaim()).toBe(false);
    fixture.componentInstance.claimForm.controls.description.setValue('Trabajo defectuoso');
    fixture.componentInstance.sendClaim();
    http.expectNone(url + '/disputes/requests/10');
  });
  it('a claim in progress cannot update a different request context', () => {
    completed(new Date(Date.now() + 86400000).toISOString());
    const panel = fixture.componentInstance;
    panel.claimForm.controls.description.setValue('Trabajo defectuoso');
    panel.sendClaim();
    const claim = http.expectOne(url + '/disputes/requests/10');
    fixture.componentRef.setInput('requestId', 11);
    fixture.detectChanges();
    expect(claim.cancelled).toBe(true);
    http.expectOne(url + '/requests/11/contract').flush({ ...summary, serviceRequestId: 11 });
    http
      .expectOne(url + '/payments/request/11')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(panel.dispute()).toBeNull();
  });
  it('refreshes commercial state when the parent confirms completion', () => {
    load();
    fixture.componentRef.setInput('requestStatus', ServiceRequestStatus.COMPLETED);
    fixture.detectChanges();
    completed(new Date(Date.now() + 86400000).toISOString());
    expect(fixture.nativeElement.textContent).toContain('Valorar el trabajo');
  });

  it('204 aftercare remains absent without a panel error', () => {
    completed(new Date(Date.now() + 86400000).toISOString());
    expect(fixture.componentInstance.review()).toBeNull();
    expect(fixture.componentInstance.dispute()).toBeNull();
    expect(fixture.componentInstance.error()).toBeNull();
  });
  for (const resource of ['reviews', 'disputes']) {
    for (const status of [401, 403, 404, 500]) {
      it(resource + ' preserves real HTTP ' + status + ' errors', () => {
        completed(new Date(Date.now() + 86400000).toISOString(), { resource, status });
        expect(fixture.componentInstance.error()).toBe('Real backend failure');
      });
    }
  }
});
