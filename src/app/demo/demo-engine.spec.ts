import { describe, it, expect, beforeEach } from 'vitest';
import { DemoEngine, DemoError, DemoStorage } from './demo-engine';
import { DEMO_KEY, DEMO_PASSWORD } from './demo-state';
import { ServiceRequest } from '../models/request.model';
import { ContractSummary } from '../models/contract.model';
import { PaymentResponse } from '../models/payment.model';
import { ConversationResponse, MessageResponse } from '../models/messaging.model';
const memory = (): DemoStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
};
let engine: DemoEngine, storage: DemoStorage;
const call = (method: string, path: string, body: unknown = null) =>
  engine.handle(method, '/api/' + path, body);
const login = (email: string) => call('POST', 'auth/login', { email, password: DEMO_PASSWORD });
async function matched(fixed = false, visit = false) {
  await login('trabajador@fixy.demo');
  const p = (await call('POST', 'requests/101/proposals', {
    message: 'Reparación completa',
    estimatedPrice: 55000,
    priceType: fixed ? 'FIXED' : 'NEGOTIABLE',
    requiresVisit: visit,
  })) as { id: number };
  await login('cliente@fixy.demo');
  await call('PATCH', `requests/101/proposals/${p.id}/select`);
}
async function agreed() {
  await matched();
  await login('trabajador@fixy.demo');
  const c = (await call('POST', 'requests/101/contract/quotes', {
    laborAmount: 40000,
    materialsAmount: 15000,
    scope: 'Reemplazo y prueba de cañería',
  })) as ContractSummary;
  await login('cliente@fixy.demo');
  await call('POST', `requests/101/contract/quotes/${c.quotes[0].id}/accept`);
}
beforeEach(() => {
  storage = memory();
  engine = new DemoEngine(storage);
});
describe('Fixy demo, operaciones relacionadas', () => {
  it('completa el recorrido con pago HELD, protección, review y rating persistidos', async () => {
    await login('cliente@fixy.demo');
    const r = (await call('POST', 'requests', {
      title: 'Nueva pérdida',
      description: 'Revisar cañería',
      category: 'PLOMERIA',
    })) as ServiceRequest;
    expect(
      ((await call('GET', 'requests/my')) as ServiceRequest[]).some((v) => v.id === r.id),
    ).toBe(true);
    await login('trabajador@fixy.demo');
    const p = (await call('POST', `requests/${r.id}/proposals`, {
      message: 'Reparación completa',
      estimatedPrice: 55000,
      priceType: 'FIXED',
    })) as { id: number };
    await login('cliente@fixy.demo');
    await call('PATCH', `requests/${r.id}/proposals/${p.id}/select`);
    const c = (await call('GET', `requests/${r.id}/contract`)) as ContractSummary;
    expect(c.agreement?.totalAmount).toBe(55000);
    await call('POST', 'payments', { serviceRequestId: r.id });
    await engine.confirmPayment(r.id);
    await login('trabajador@fixy.demo');
    await call('PATCH', `requests/${r.id}/start`);
    await login('cliente@fixy.demo');
    await call('PATCH', `requests/${r.id}/complete`);
    await call('POST', `reviews/requests/${r.id}`, { rating: 5, comment: 'Excelente' });
    engine = new DemoEngine(storage);
    expect(engine.request(r.id).status).toBe('COMPLETED');
    expect(engine.state.payments.find((p) => p.serviceRequestId === r.id)!.status).toBe('HELD');
    expect(
      engine.state.payments.find((p) => p.serviceRequestId === r.id)!.protectionEndsAt,
    ).not.toBeNull();
    expect(engine.state.workers.find((w) => w.id === 2)?.rating).toBe(5);
  });
  it('no inicia sin pago, no permite aceptar presupuesto a un tercero ni sobrescribir el acuerdo', async () => {
    await matched();
    await login('trabajador@fixy.demo');
    await expect(call('PATCH', 'requests/101/start')).rejects.toMatchObject({ status: 409 });
    const c = (await call('POST', 'requests/101/contract/quotes', {
      laborAmount: 40000,
      materialsAmount: 15000,
      scope: 'Reparación',
    })) as ContractSummary;
    await login('sofia@fixy.demo');
    await expect(
      call('POST', `requests/101/contract/quotes/${c.quotes[0].id}/accept`),
    ).rejects.toMatchObject({ status: 403 });
    await login('cliente@fixy.demo');
    await call('POST', `requests/101/contract/quotes/${c.quotes[0].id}/accept`);
    await login('trabajador@fixy.demo');
    await expect(
      call('POST', 'requests/101/contract/quotes', {
        laborAmount: 1,
        materialsAmount: 0,
        scope: 'Cambio',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(engine.state.contracts[101].agreement?.totalAmount).toBe(55000);
  });
  it('rechaza pagos sin acuerdo y es idempotente al confirmar y crear pagos', async () => {
    await matched();
    await expect(call('POST', 'payments', { serviceRequestId: 101 })).rejects.toMatchObject({
      status: 409,
    });
    engine = new DemoEngine(storage);
    engine.reset();
    await agreed();
    const a = (await call('POST', 'payments', { serviceRequestId: 101 })) as PaymentResponse;
    const b = (await call('POST', 'payments', { serviceRequestId: 101 })) as PaymentResponse;
    expect(a.id).toBe(b.id);
    await engine.confirmPayment(101);
    await engine.confirmPayment(101);
    expect(engine.state.payments.filter((p) => p.serviceRequestId === 101).length).toBe(1);
    expect(engine.request(101).events.filter((e) => e.type === 'PAYMENT_CONFIRMED').length).toBe(1);
  });
  it('chat mantiene el interlocutor correcto y los mensajes al cambiar sesión', async () => {
    await matched(true);
    const c = (await call('GET', 'conversations/requests/101')) as ConversationResponse;
    expect(c.counterpart.userId).toBe(2);
    await call('POST', `messages/conversations/${c.id}`, { content: 'Hola Luca' });
    await login('trabajador@fixy.demo');
    const other = (await call('GET', `conversations/${c.id}`)) as ConversationResponse;
    expect(other.counterpart.userId).toBe(1);
    await call('POST', `messages/conversations/${c.id}`, { content: 'Hola José' });
    engine = new DemoEngine(storage);
    expect(
      ((await call('GET', `messages/conversations/${c.id}`)) as MessageResponse[]).length,
    ).toBe(2);
    await login('sofia@fixy.demo');
    await expect(call('GET', `messages/conversations/${c.id}`)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('registro guarda hash con salt, restaura sesión y reset borra el recorrido', async () => {
    const password = 'Ficticia123!';
    await call('POST', 'auth/register', {
      name: 'Ana',
      surname: 'Demo',
      email: 'ana@fixy.demo',
      password,
      confirmPassword: password,
      phoneNumber: '+541155550999',
      birthDate: '1990-01-01',
      captchaToken: 'demo',
    });
    expect(storage.getItem(DEMO_KEY)).not.toContain(password);
    engine = new DemoEngine(storage);
    expect(engine.user().email).toBe('ana@fixy.demo');
    await call('POST', 'auth/login', { email: 'ana@fixy.demo', password });
    await expect(
      call('POST', 'auth/login', { email: 'ana@fixy.demo', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(DemoError);
    engine.reset();
    expect(engine.state.sessionId).toBeNull();
    expect(engine.state.users.length).toBe(4);
  });
  it('rechaza doble review y rating inválido; COMPLETED no libera fondos', async () => {
    await matched(true);
    await call('POST', 'payments', { serviceRequestId: 101 });
    await engine.confirmPayment(101);
    await login('trabajador@fixy.demo');
    await call('PATCH', 'requests/101/start');
    await login('cliente@fixy.demo');
    await call('PATCH', 'requests/101/complete');
    await expect(call('POST', 'reviews/requests/101', { rating: 6 })).rejects.toMatchObject({
      status: 400,
    });
    await call('POST', 'reviews/requests/101', { rating: 4 });
    await expect(call('POST', 'reviews/requests/101', { rating: 5 })).rejects.toMatchObject({
      status: 409,
    });
    expect(engine.state.payments.find((p) => p.serviceRequestId === 101)!.status).toBe('HELD');
  });
  it('visita debe completarse antes del quote y nunca cobra diagnóstico', async () => {
    await matched(false, true);
    await login('trabajador@fixy.demo');
    await expect(
      call('POST', 'requests/101/contract/quotes', {
        laborAmount: 100,
        materialsAmount: 0,
        scope: 'Trabajo',
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      call('POST', 'requests/101/contract/visit', {
        price: 100,
        scheduledAt: '2026-01-01T00:00:00Z',
        notes: 'Inspección',
      }),
    ).rejects.toMatchObject({ status: 409 });
    await call('POST', 'requests/101/contract/visit', {
      price: 0,
      scheduledAt: '2026-01-01T00:00:00Z',
      notes: 'Inspección',
    });
    await call('POST', 'requests/101/contract/visit/complete');
    await call('POST', 'requests/101/contract/quotes', {
      laborAmount: 100,
      materialsAmount: 0,
      scope: 'Trabajo',
    });
    expect(engine.state.contracts[101].quotes.length).toBe(1);
  });
  it('reclamo conserva el pago HELD y bloquea liquidación', async () => {
    await matched(true);
    await call('POST', 'payments', { serviceRequestId: 101 });
    await engine.confirmPayment(101);
    await login('trabajador@fixy.demo');
    await call('PATCH', 'requests/101/start');
    await login('cliente@fixy.demo');
    await call('POST', 'disputes/requests/101', {
      reason: 'POOR_QUALITY',
      description: 'Reclamo ficticio',
    });
    await expect(call('POST', 'payments/101/release')).rejects.toMatchObject({ status: 409 });
    expect(engine.state.payments.find((p) => p.serviceRequestId === 101)!.status).toBe('HELD');
  });
});

describe('Acceso y concurrencia',()=>{
 it('impide leer solicitudes ajenas y restringe cierre/reapertura del chat según el dominio',async()=>{
   await login('sofia@fixy.demo');await expect(call('GET','requests/101')).rejects.toMatchObject({status:403});
   await matched(true);const c=await call('GET','conversations/requests/101') as ConversationResponse;
   await call('POST','payments',{serviceRequestId:101});await engine.confirmPayment(101);await login('trabajador@fixy.demo');await call('PATCH','requests/101/start');
   await expect(call('POST',`conversations/${c.id}/close`)).rejects.toMatchObject({status:409});
   await login('cliente@fixy.demo');await call('PATCH','requests/101/complete');await call('POST',`conversations/${c.id}/close`);
   await expect(call('POST',`conversations/${c.id}/reopen`)).rejects.toMatchObject({status:409});await call('POST','disputes/requests/101',{reason:'POOR_QUALITY',description:'Reclamo ficticio'});expect((await call('POST',`conversations/${c.id}/reopen`) as ConversationResponse).status).toBe('OPEN');
 });
 it('creaciones y confirmaciones simultáneas no duplican el pago ni su evento',async()=>{await matched(true);await Promise.all([call('POST','payments',{serviceRequestId:101}),call('POST','payments',{serviceRequestId:101})]);await Promise.all([engine.confirmPayment(101),engine.confirmPayment(101)]);expect(engine.state.payments.filter(p=>p.serviceRequestId===101)).toHaveLength(1);expect(engine.request(101).events.filter(e=>e.type==='PAYMENT_CONFIRMED')).toHaveLength(1);});
});
