import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { DemoStore, demoInterceptor } from './demo-store';
import { DemoConfirm } from './demo-confirm';
import { PaymentService } from '../core/services/payment.service';
import { AuthService } from '../core/services/auth.service';
import { DEMO_PASSWORD } from './demo-state';
describe('Adaptación demo de Angular', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(DemoStore).reset();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('HTTP desconocido falla sin llegar al backend de red', async () => {
    await expect(
      firstValueFrom(TestBed.inject(HttpClient).get('https://third-party.example/unsupported')),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
    TestBed.inject(HttpTestingController).expectNone('https://third-party.example/unsupported');
  });
  it('login, logout y restauración usan exclusivamente el almacén demo', async () => {
    const auth = TestBed.inject(AuthService);
    await firstValueFrom(auth.login({ email: 'cliente@fixy.demo', password: DEMO_PASSWORD }));
    expect(auth.getCurrentUser()?.id).toBe(1);
    expect(auth.getAccessToken()).toBe('demo-local-session');
    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('cancelar la confirmación conserva PENDING y confirmar crea un HELD idempotente', async () => {
    await firstValueFrom(
      TestBed.inject(AuthService).login({ email: 'cliente@fixy.demo', password: DEMO_PASSWORD }),
    );
    const service = TestBed.inject(PaymentService),
      dialog = TestBed.inject(DemoConfirm);
    const cancelled = firstValueFrom(service.startCheckout(103));
    await vi.waitFor(() => expect(dialog.text()).not.toBeNull());
    dialog.finish(false);
    await expect(cancelled).rejects.toThrow('cancelado');
    expect(
      TestBed.inject(DemoStore).state.payments.find((p) => p.serviceRequestId === 103)?.status,
    ).toBe('PENDING');
    const confirmed = firstValueFrom(service.startCheckout(103));
    await vi.waitFor(() => expect(dialog.text()).not.toBeNull());
    dialog.finish(true);
    expect((await confirmed).status).toBe('HELD');
    expect((await firstValueFrom(service.startCheckout(103))).status).toBe('HELD');
    expect(
      TestBed.inject(DemoStore).state.payments.filter((p) => p.serviceRequestId === 103).length,
    ).toBe(1);
  });
});
