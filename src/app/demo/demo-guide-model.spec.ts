import { describe, expect, it } from 'vitest';
import { pageGuide } from './demo-guide-model';
import { seedState } from './demo-state';
import { ServiceRequestStatus } from '../models/enums/service-request-status.enum';
import { PaymentStatus } from '../models/enums/payment-status.enum';
describe('contextual demo guide', () => {
  it('covers each main screen with actionable local-demo instructions', () => {
    const state = seedState();
    for (const route of [
      '/home',
      '/login',
      '/register',
      '/dashboard/client',
      '/dashboard/worker',
      '/requests/new',
      '/requests/publish',
      '/requests/my',
      '/requests/open',
      '/requests/103',
      '/conversations/6103',
      '/payments',
      '/service-offerings',
      '/services/11',
      '/worker/services/new',
      '/favorites',
      '/become-worker',
      '/become-worker-info',
      '/workers/2',
      '/worker/profile',
      '/demo-info',
    ]) {
      const guide = pageGuide(route, state);
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.steps.every((s) => s.title.length > 0 && s.text.length > 0)).toBe(true);
    }
  });
  it('explains payment then work start based on real local state', () => {
    const state = seedState();
    state.sessionId = 1;
    expect(pageGuide('/requests/103?demo=true', state).steps.at(-1)?.title).toBe('Simulá el pago');
    state.payments.find((p) => p.serviceRequestId === 103)!.status = PaymentStatus.HELD;
    expect(pageGuide('/requests/103', state).steps.at(-1)?.title).toBe(
      'Iniciá el trabajo como profesional',
    );
    state.requests.find((r) => r.id === 103)!.status = ServiceRequestStatus.COMPLETED;
    expect(pageGuide('/requests/103', state).steps[0].title).toContain('≠');
  });
  it('distinguishes worker proposal from client selection and accepted agreement', () => {
    const state = seedState();
    state.sessionId = 2;
    expect(pageGuide('/requests/101', state).steps[1].title).toBe('Enviá tu propuesta');
    state.sessionId = 1;
    expect(pageGuide('/requests/101', state).steps[1].title).toBe('Seleccioná al profesional');
    state.sessionId = 2;
    expect(pageGuide('/requests/103', state).steps[1].title).toBe('El cliente confirma el pago');
  });
  it('never promises a real charge or a timer and gives absent-resource guidance', () => {
    const state = seedState();
    expect(pageGuide('/payments', state).steps[2].text).toContain('No se usa Mercado Pago');
    expect(pageGuide('/requests/99999', state).steps[0].title).toBe(
      'Abrí una solicitud disponible',
    );
  });
});
