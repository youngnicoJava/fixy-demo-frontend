import { DemoState, DEMO_PASSWORD, DEMO_KEY, seedState } from './demo-state';
import { Role } from '../models/enums/Role.enum';
import { Category } from '../models/enums/category.enum';
import { PriceType } from '../models/enums/price-type.enum';
import { ProposalStatus } from '../models/enums/proposal-status.enum';
import { WorkerStatus } from '../models/enums/worker-status.enum';
import { ServiceRequestStatus as RequestStatus } from '../models/enums/service-request-status.enum';
import { ServiceRequestEventType as EventType } from '../models/enums/service-request-event-type.enum';
import { PaymentStatus } from '../models/enums/payment-status.enum';
import { MessageStatus } from '../models/enums/message-status.enum';
import { MessageType } from '../models/enums/message-type.enum';
import { DisputeStatus } from '../models/enums/dispute-status.enum';
import {
  ServiceRequestRequest,
  WorkerProposalRequest,
  ServiceRequest,
} from '../models/request.model';
import { QuoteInput, VisitInput, ContractSummary, ServiceQuote } from '../models/contract.model';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { WorkerServiceOfferingRequest, WorkerProfileRequest } from '../models/worker.profile.model';
import { SavedAddressRequest } from '../models/client.model';
import { MessageRequest } from '../models/messaging.model';
import { ReviewRequest } from '../models/review.model';
import { DisputeRequest, DisputeEvidenceRequest } from '../models/dispute.model';
export class DemoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const check = (condition: unknown, status: number, message: string): void => {
  if (!condition) throw new DemoError(status, message);
};
const stamp = () => new Date().toISOString();
export class DemoEngine {
  state: DemoState;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage?: DemoStorage) {
    const saved = storage?.getItem(DEMO_KEY);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      this.state = parsed?.version === 1 && Array.isArray(parsed.users) ? parsed : seedState();
    } catch {
      this.state = seedState();
    }
    if (this.state.sessionId && !this.state.users.some((u) => u.id === this.state.sessionId))
      this.state.sessionId = null;
  }
  save() {
    this.storage?.setItem(DEMO_KEY, JSON.stringify(this.state));
  }
  reset() {
    this.state = seedState();
    this.save();
  }
  user() {
    const u = this.state.users.find((u) => u.id === this.state.sessionId);
    check(u, 401, 'Entrá con un usuario demo.');
    return u!;
  }
  role(role: Role) {
    const u = this.user();
    check(u.role === role, 403, 'Esta acción corresponde a otro rol.');
    return u;
  }
  worker() {
    const u = this.role(Role.WORKER);
    const w = this.state.workers.find((w) => w.userId === u.id);
    check(w?.status === WorkerStatus.VERIFIED, 403, 'Se requiere un profesional verificado.');
    return w!;
  }
  id() {
    return this.state.nextId++;
  }
  request(id: number) {
    const r = this.state.requests.find((r) => r.id === id);
    check(r, 404, 'Solicitud inexistente.');
    return r!;
  }
  owner(r: ServiceRequest & { clientUserId: number }) {
    check(
      this.role(Role.CLIENT).id === r.clientUserId,
      403,
      'Sólo el cliente de esta contratación.',
    );
  }
  participant(r: ServiceRequest & { clientUserId: number }) {
    const u = this.user();
    const w = this.state.workers.find((w) => w.id === r.selectedProposal?.workerId);
    check(
      u.id === r.clientUserId || u.id === w?.userId,
      403,
      'Sólo participantes de esta contratación.',
    );
  }
  selectedWorker(r: ServiceRequest) {
    const w = this.worker();
    check(r.selectedProposal?.workerId === w.id, 403, 'Sólo el profesional seleccionado.');
    return w;
  }
  event(r: ServiceRequest, type: EventType, description: string) {
    r.events.push({
      id: this.id(),
      type,
      actorUserId: this.user().id,
      actorName: this.user().fullName,
      createdAt: stamp(),
      description,
    });
  }
  contract(r: ServiceRequest & { clientUserId: number }): ContractSummary {
    const w = this.state.workers.find((w) => w.id === r.selectedProposal?.workerId);
    const c = (this.state.contracts[r.id] ??= {
      serviceRequestId: r.id,
      title: r.title,
      clientId: r.clientUserId,
      workerUserId: w?.userId ?? null,
      workerName: w?.fullName ?? null,
      quotes: [],
      agreement: null,
      visit: null,
    });
    if (c.agreement) c.agreement.status = r.status;
    return c;
  }
  acceptQuote(r: ServiceRequest & { clientUserId: number }, q: ServiceQuote) {
    const c = this.contract(r);
    check(!c.agreement, 409, 'El acuerdo aceptado no puede sobrescribirse.');
    q.status = 'ACCEPTED';
    q.decidedAt = stamp();
    c.agreement = {
      id: this.id(),
      quoteId: q.id,
      clientId: r.clientUserId,
      workerId: q.workerId,
      totalAmount: q.totalAmount,
      scope: q.scope,
      protectionPeriodSeconds: 259200,
      acceptedAt: stamp(),
      status: r.status,
    };
    this.event(r, EventType.QUOTE_ACCEPTED, 'Presupuesto aceptado y acuerdo registrado');
  }
  conversation(c: DemoState['conversations'][number]) {
    const u = this.user();
    check(
      [c.clientUserId, c.workerUserId].includes(u.id),
      403,
      'No participás de esta conversación.',
    );
    const other = this.state.users.find(
      (v) => v.id === (u.id === c.clientUserId ? c.workerUserId : c.clientUserId),
    )!;
    const parts = other.fullName.split(' ');
    return {
      id: c.id,
      serviceRequestId: c.serviceRequestId,
      serviceOfferingId: c.serviceOfferingId,
      serviceOfferingTitle:
        this.state.offerings.find((o) => o.id === c.serviceOfferingId)?.title ?? null,
      currentUserIsClient: u.id === c.clientUserId,
      counterpart: {
        userId: other.id,
        name: parts.shift()!,
        surname: parts.join(' '),
        profilePhotoUrl:
          this.state.workers.find((w) => w.userId === other.id)?.profilePhotoUrl ?? null,
      },
      status: c.status,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
    };
  }
  async hash(password: string, salt: string) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password));
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  handle(method: string, url: string, body: unknown = null): Promise<unknown> {
    const result = this.queue.then(() => this.execute(method, url, body));
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async execute(method: string, url: string, body: unknown = null): Promise<unknown> {
    const snapshot = structuredClone(this.state);
    try {
      const result = await this.dispatch(method, url, body);
      if (method !== 'GET') this.save();
      return structuredClone(result ?? null);
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }
  private async dispatch(method: string, url: string, body: unknown): Promise<unknown> {
    const parsed = new URL(url, 'https://fixy.demo');
    const p = parsed.pathname
      .replace(/^\/api\/?/, '')
      .split('/')
      .filter(Boolean);
    const get = method === 'GET';
    const n = Number(p[1]);
    if (p[0] === 'auth') {
      if (p[1] === 'register') {
        const b = body as RegisterRequest;
        check(
          b.name?.trim() &&
            b.surname?.trim() &&
            /^\S+@\S+\.\S+$/.test(b.email) &&
            b.password?.length >= 8 &&
            b.password === b.confirmPassword,
          400,
          'Revisá los datos de registro ficticio.',
        );
        check(
          !this.state.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase()),
          409,
          'Ese email ya tiene una cuenta demo.',
        );
        const id = this.id(),
          salt = crypto.randomUUID();
        const u = {
          id,
          email: b.email.toLowerCase(),
          fullName: b.name.trim() + ' ' + b.surname.trim(),
          phoneNumber: b.phoneNumber,
          role: Role.CLIENT,
        };
        this.state.users.push(u);
        this.state.credentials[id] = { salt, hash: await this.hash(b.password, salt) };
        this.state.clients[id] = {
          id,
          fullName: u.fullName,
          savedAddresses: [],
          activeAddress: null,
        };
        this.state.sessionId = id;
      } else if (p[1] === 'login') {
        const b = body as LoginRequest;
        const u = this.state.users.find((u) => u.email.toLowerCase() === b.email?.toLowerCase());
        check(u, 401, 'Cuenta demo inexistente.');
        const cred = this.state.credentials[u!.id];
        check(
          cred
            ? (await this.hash(b.password, cred.salt)) === cred.hash
            : b.password === DEMO_PASSWORD,
          401,
          'Contraseña demo incorrecta.',
        );
        this.state.sessionId = u!.id;
      } else check(p[1] === 'refresh', 404, 'Operación de sesión no disponible.');
      return {
        accessToken: 'demo-local-session',
        refreshToken: 'demo-local-session',
        tokenType: 'Demo',
        user: this.user(),
      };
    }
    if (p[0] === 'location') {
      const address =
        parsed.searchParams.get('address') ??
        parsed.searchParams.get('q') ??
        'Buenos Aires (ubicación ficticia)';
      const location = {
        label: address + ' · ubicación demo',
        address,
        latitude: -34.6037,
        longitude: -58.3816,
      };
      return p[1] === 'search' ? [location] : location;
    }
    if (p[0] === 'images') {
      this.user();
      check(body instanceof FormData, 400, 'Elegí imágenes locales.');
      const results = [];
      for (const file of (body as FormData).getAll('files')) {
        check(
          file instanceof File && file.type.startsWith('image/') && file.size <= 1024 * 1024,
          400,
          'Usá imágenes de hasta 1 MB.',
        );
        const data = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new DemoError(400, 'No se pudo leer la imagen'));
          r.readAsDataURL(file as File);
        });
        results.push(data);
      }
      return results;
    }
    if (p[0] === 'client' || (p[0] === 'worker' && p[1] === 'addresses')) {
      const u = this.user();
      const profile = this.state.clients[u.id];
      check(profile, 404, 'Perfil no disponible.');
      if (p[1] === 'profile') return profile;
      if (p[1] === 'addresses') {
        if (!get) {
          const addressId = Number(p[2]),
            b = body as SavedAddressRequest;
          if (method === 'POST') {
            check(b.address?.trim(), 400, 'Ingresá una dirección ficticia.');
            const a = { ...b, id: this.id(), latitude: -34.6037, longitude: -58.3816 };
            profile.savedAddresses.push(a);
            profile.activeAddress = a;
          } else {
            const a = profile.savedAddresses.find((a) => a.id === addressId);
            check(a, 404, 'Dirección inexistente.');
            if (p[3] === 'active') profile.activeAddress = a!;
            else if (method === 'PUT') {
              Object.assign(a!, b);
              if (profile.activeAddress?.id === a!.id) profile.activeAddress = a!;
            } else if (method === 'DELETE') {
              profile.savedAddresses = profile.savedAddresses.filter((a) => a.id !== addressId);
              if (profile.activeAddress?.id === addressId)
                profile.activeAddress = profile.savedAddresses[0] ?? null;
            }
          }
        }
        return p[0] === 'client'
          ? profile
          : { savedAddresses: profile.savedAddresses, activeAddress: profile.activeAddress };
      }
    }
    if (p[0] === 'worker') {
      if (p[1] === 'public')
        return p[2]
          ? (this.state.workers.find((w) => w.id === Number(p[2])) ?? null)
          : this.state.workers.filter(
              (w) =>
                w.verified &&
                (!parsed.searchParams.get('category') ||
                  w.categories.includes(parsed.searchParams.get('category') as Category)),
            );
      if (p[1] === 'profile') {
        const u = this.user();
        let w = this.state.workers.find((w) => w.userId === u.id);
        if (!get) {
          const b = body as WorkerProfileRequest;
          check(
            b.categories?.length && b.acceptedTerms,
            400,
            'Elegí categorías y aceptá las condiciones.',
          );
          if (!w) {
            w = {
              id: this.id(),
              userId: u.id,
              fullName: u.fullName,
              ...b,
              labelType: b.labelType ?? null,
              customLabel: b.customLabel ?? null,
              floor: b.floor ?? null,
              apartment: b.apartment ?? null,
              description: b.description ?? null,
              profilePhotoUrl: null,
              rating: null,
              status: WorkerStatus.PENDING,
              verified: false,
              latitude: b.latitude ?? null,
              longitude: b.longitude ?? null,
            };
            this.state.workers.push(w);
          } else Object.assign(w, b);
        }
        check(w, 404, 'Todavía no tenés perfil profesional.');
        return w;
      }
      if (p[1] === 'services') {
        if (p[2] === 'public') {
          let list = this.state.offerings
            .filter((o) => o.active)
            .map((o) => ({
              ...o,
              workerRating: this.state.workers.find((w) => w.id === o.workerId)?.rating ?? null,
            }));
          if (p[3] === 'category') list = list.filter((o) => o.category === p[4]);
          else if (p[3] === 'featured') {
            list = list.filter((o) => o.featured);
            if (p[4] === 'category') list = list.filter((o) => o.category === p[5]);
            list = list.slice(0, Number(parsed.searchParams.get('limit') ?? 8));
          } else if (p[3]) {
            const o = list.find((o) => o.id === Number(p[3]));
            check(o, 404, 'Publicación inexistente.');
            return o;
          }
          return list;
        }
        const w = this.worker();
        if (p[2] === 'my') return this.state.offerings.filter((o) => o.workerId === w.id);
        const b = body as WorkerServiceOfferingRequest;
        if (method === 'POST') {
          check(
            b.title?.trim() && b.description?.trim() && w.categories.includes(b.category),
            400,
            'Revisá el servicio y su categoría.',
          );
          const o = {
            ...b,
            id: this.id(),
            workerId: w.id,
            workerUserId: w.userId,
            workerFullName: w.fullName,
            workerProfilePhotoUrl: w.profilePhotoUrl,
            workerRating: w.rating,
            workerStatus: w.status,
            workerVerified: w.verified,
            active: true,
            featured: false,
            createdAt: stamp(),
            updatedAt: stamp(),
          };
          this.state.offerings.push(o);
          return o;
        }
        const o = this.state.offerings.find((o) => o.id === Number(p[2]));
        check(o && o.workerId === w.id, 403, 'Sólo el autor puede editar la publicación.');
        if (method === 'DELETE') o!.active = false;
        else if (p[3] === 'activate') o!.active = true;
        else Object.assign(o!, b, { updatedAt: stamp() });
        return o;
      }
    }
    if (p[0] === 'requests') {
      const u = this.user();
      if (p[1] === 'my') {
        this.role(Role.CLIENT);
        return this.state.requests.filter((r) => r.clientUserId === u.id);
      }
      if (p[1] === 'worker') {
        const w = this.worker();
        return this.state.requests.filter(
          (r) =>
            r.selectedProposal?.workerId === w.id || r.proposals.some((p) => p.workerId === w.id),
        );
      }
      if (p[1] === 'open') {
        this.worker();
        return this.state.requests.filter(
          (r) =>
            r.status === RequestStatus.OPEN &&
            (!parsed.searchParams.get('category') ||
              r.category === parsed.searchParams.get('category')),
        );
      }
      if (method === 'POST' && !p[1]) {
        this.role(Role.CLIENT);
        const b = body as ServiceRequestRequest;
        check(
          b.title?.trim() && b.description?.trim() && Object.values(Category).includes(b.category),
          400,
          'Completá título, descripción y categoría.',
        );
        const a = this.state.clients[u.id].activeAddress;
        check(a, 409, 'Agregá una dirección ficticia antes de publicar.');
        const r = {
          ...b,
          id: this.id(),
          clientUserId: u.id,
          address: a!.address,
          latitude: a!.latitude,
          longitude: a!.longitude,
          status: RequestStatus.OPEN,
          createdAt: stamp(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          matchedAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          proposals: [],
          selectedProposal: null,
          events: [],
        };
        this.state.requests.push(r);
        this.event(r, EventType.REQUEST_CREATED, 'Solicitud publicada');
        return r;
      }
      const r = this.request(n);
      if (get && (!p[2] || p[2]==='comments' || p[2]==='events')) {
        const profile=this.state.workers.find(w=>w.userId===u.id);
        check(r.clientUserId===u.id || (profile && ((r.status===RequestStatus.OPEN && profile.verified && profile.categories.includes(r.category)) || r.proposals.some(p=>p.workerId===profile.id))),403,'No tenés acceso a esta solicitud.');
        if(!p[2])return r;
      }
      if (p[2] === 'events') return r.events;
      if (p[2] === 'comments') {
        const comments = (this.state.comments[n] ??= []);
        if (!get) {
          const b = body as { content: string; parentCommentId?: number };
          check(
            r.status === RequestStatus.OPEN && b.content?.trim(),
            409,
            'Los comentarios requieren una solicitud abierta.',
          );
          if (b.parentCommentId)
            check(
              comments.some((c) => c.id === b.parentCommentId),
              400,
              'Comentario padre inexistente.',
            );
          const c = {
            id: this.id(),
            authorId: u.id,
            authorName: u.fullName,
            authorRole: u.role,
            content: b.content.trim(),
            createdAt: stamp(),
            updatedAt: null,
            parentCommentId: b.parentCommentId ?? null,
            requestAuthor: u.id === r.clientUserId,
          };
          comments.push(c);
          return c;
        }
        return comments;
      }
      if (p[2] === 'proposals') {
        check(r.status === RequestStatus.OPEN, 409, 'La solicitud ya no está abierta.');
        if (method === 'POST') {
          const w = this.worker(),
            b = body as WorkerProposalRequest;
          check(
            w.userId !== r.clientUserId && w.categories.includes(r.category),
            403,
            'No podés proponer en esta solicitud.',
          );
          check(!r.proposals.some((p) => p.workerId === w.id), 409, 'Ya enviaste una propuesta.');
          check(
            b.message?.trim() &&
              Object.values(PriceType).includes(b.priceType) &&
              Number.isFinite(b.estimatedPrice) &&
              b.estimatedPrice >= 0 &&
              (b.priceType !== PriceType.FIXED || b.requiresVisit || b.estimatedPrice > 0),
            400,
            'Revisá el importe y la propuesta.',
          );
          const proposal = {
            ...b,
            id: this.id(),
            workerId: w.id,
            workerFullName: w.fullName,
            workerRating: w.rating ?? 0,
            workerStatus: w.status,
            status: ProposalStatus.PENDING,
          };
          r.proposals.push(proposal);
          this.event(r, EventType.PROPOSAL_CREATED, 'Propuesta recibida');
          return proposal;
        }
        const proposal = r.proposals.find((v) => v.id === Number(p[3]));
        check(proposal?.status === ProposalStatus.PENDING, 409, 'Propuesta no disponible.');
        if (p[4] === 'withdraw') {
          check(
            proposal!.workerId === this.worker().id,
            403,
            'Sólo el autor puede retirar su propuesta.',
          );
          proposal!.status = ProposalStatus.WITHDRAWN;
          this.event(r, EventType.PROPOSAL_WITHDRAWN, 'Propuesta retirada');
          return null;
        }
        this.owner(r);
        check(p[4] === 'select', 404, 'Acción inexistente.');
        const w = this.state.workers.find((w) => w.id === proposal!.workerId)!;
        check(w.verified && w.categories.includes(r.category), 403, 'Profesional no habilitado.');
        for (const other of r.proposals)
          if (other.status === ProposalStatus.PENDING)
            other.status =
              other.id === proposal!.id ? ProposalStatus.ACCEPTED : ProposalStatus.REJECTED;
        r.selectedProposal = proposal!;
        r.status = RequestStatus.MATCHED;
        r.matchedAt = stamp();
        this.event(r, EventType.PROPOSAL_ACCEPTED, 'Profesional seleccionado');
        this.event(r, EventType.REQUEST_MATCHED, 'Contratación vinculada');
        this.state.conversations.push({
          id: this.id(),
          clientUserId: r.clientUserId,
          workerUserId: w.userId,
          serviceRequestId: n,
          serviceOfferingId: null,
          status: 'OPEN',
          createdAt: stamp(),
          closedAt: null,
        });
        const c = this.contract(r);
        if (proposal!.requiresVisit)
          c.visit = {
            id: this.id(),
            price: null,
            status: 'REQUIRED',
            scheduledAt: null,
            completedAt: null,
            notes: null,
          };
        else if (proposal!.priceType === PriceType.FIXED) {
          const q: ServiceQuote = {
            id: this.id(),
            revision: 1,
            workerId: w.id,
            laborAmount: proposal!.estimatedPrice,
            materialsAmount: 0,
            totalAmount: proposal!.estimatedPrice,
            scope: proposal!.message,
            status: 'SENT',
            createdAt: stamp(),
            decidedAt: null,
          };
          c.quotes.push(q);
          this.acceptQuote(r, q);
        }
        return r;
      }
      if (p[2] === 'contract') {
        this.participant(r);
        const c = this.contract(r);
        if (get) return c;
        if (p[3] === 'quotes') {
          if (!p[4]) {
            const w = this.selectedWorker(r),
              b = body as QuoteInput;
            check(
              [RequestStatus.MATCHED, RequestStatus.IN_PROGRESS].includes(r.status) && !c.agreement,
              409,
              'El acuerdo ya existe o la solicitud no admite presupuestos.',
            );
            check(
              Number.isFinite(b.laborAmount) &&
                b.laborAmount >= 0 &&
                Number.isFinite(b.materialsAmount) &&
                b.materialsAmount >= 0 &&
                b.laborAmount + b.materialsAmount > 0 &&
                b.scope?.trim(),
              400,
              'Completá el presupuesto.',
            );
            check(
              !c.visit || c.visit.status === 'COMPLETED',
              409,
              'Completá la visita antes de presupuestar.',
            );
            c.quotes.filter((q) => q.status === 'SENT').forEach((q) => (q.status = 'SUPERSEDED'));
            c.quotes.unshift({
              id: this.id(),
              revision: c.quotes.length + 1,
              workerId: w.id,
              ...b,
              totalAmount: Math.round((b.laborAmount + b.materialsAmount) * 100) / 100,
              status: 'SENT',
              createdAt: stamp(),
              decidedAt: null,
            });
            this.event(r, EventType.QUOTE_SENT, 'Presupuesto enviado');
          } else {
            this.owner(r);
            const q = c.quotes.find((q) => q.id === Number(p[4]));
            check(q?.status === 'SENT', 409, 'Este presupuesto ya fue decidido.');
            if (p[5] === 'accept') this.acceptQuote(r, q!);
            else {
              check(p[5] === 'reject', 404, 'Decisión inexistente.');
              q!.status = 'REJECTED';
              q!.decidedAt = stamp();
              this.event(r, EventType.QUOTE_REJECTED, 'Presupuesto rechazado');
            }
          }
          return c;
        }
        if (p[3] === 'visit') {
          this.selectedWorker(r);
          check(!c.agreement, 409, 'Ya existe un acuerdo.');
          if (p[4] === 'complete') {
            check(c.visit?.status === 'SCHEDULED', 409, 'Primero coordiná la visita.');
            check(
              Date.parse(c.visit!.scheduledAt!) <= Date.now(),
              409,
              'La fecha de la visita aún no llegó.',
            );
            c.visit!.status = 'COMPLETED';
            c.visit!.completedAt = stamp();
            this.event(r, EventType.VISIT_COMPLETED, 'Visita completada');
          } else {
            const b = body as VisitInput;
            check(
              !c.quotes.length && c.visit?.status !== 'COMPLETED',
              409,
              'Coordiná la visita antes de presupuestar.',
            );
            check(
              !b.price,
              409,
              'Las visitas pagas requieren un pago independiente; no se simula un cobro indefinido.',
            );
            check(Number.isFinite(Date.parse(b.scheduledAt)), 400, 'Elegí una fecha válida.');
            c.visit = {
              id: c.visit?.id ?? this.id(),
              price: 0,
              status: 'SCHEDULED',
              scheduledAt: b.scheduledAt,
              completedAt: null,
              notes: b.notes,
            };
            this.event(r, EventType.VISIT_SCHEDULED, 'Visita gratuita coordinada');
          }
          return c;
        }
      }
      if (p[2] === 'cancel') {
        this.owner(r);
        check(r.status === RequestStatus.OPEN, 409, 'Sólo se cancelan solicitudes abiertas.');
        r.status = RequestStatus.CANCELLED;
        r.cancelledAt = stamp();
        this.event(r, EventType.REQUEST_CANCELLED, 'Solicitud cancelada');
        return r;
      }
      if (p[2] === 'start') {
        this.selectedWorker(r);
        check(
          r.status === RequestStatus.MATCHED &&
            this.state.payments.some(
              (p) => p.serviceRequestId === n && p.status === PaymentStatus.HELD,
            ),
          409,
          'Confirmá el pago acordado antes de iniciar.',
        );
        r.status = RequestStatus.IN_PROGRESS;
        r.startedAt = stamp();
        this.event(r, EventType.SERVICE_STARTED, 'Trabajo iniciado');
        return r;
      }
      if (p[2] === 'complete') {
        this.owner(r);
        const payment = this.state.payments.find((p) => p.serviceRequestId === n);
        check(
          r.status === RequestStatus.IN_PROGRESS && payment?.status === PaymentStatus.HELD,
          409,
          'Se requiere un trabajo en progreso y pago protegido.',
        );
        r.status = RequestStatus.COMPLETED;
        r.completedAt = stamp();
        payment!.protectionEndsAt = new Date(
          Date.now() + this.contract(r).agreement!.protectionPeriodSeconds * 1000,
        ).toISOString();
        this.event(r, EventType.SERVICE_COMPLETED, 'Trabajo completado');
        this.event(r, EventType.PROTECTION_STARTED, 'Comienza la protección Fixy');
        return r;
      }
    }
    if (p[0] === 'payments') {
      if (p[1] === 'my') {
        const u = this.role(Role.CLIENT);
        return this.state.requests
          .filter((r) => r.clientUserId === u.id && this.state.contracts[r.id]?.agreement)
          .map((r) => {
            const c = this.contract(r);
            return {
              agreementId: c.agreement!.id,
              serviceRequestId: r.id,
              title: r.title,
              workerName: c.workerName,
              totalAmount: c.agreement!.totalAmount,
              payment: this.state.payments.find((p) => p.serviceRequestId === r.id) ?? null,
            };
          });
      }
      if (p[1] === 'request') {
        const r = this.request(Number(p[2]));
        this.participant(r);
        return this.state.payments.find((p) => p.serviceRequestId === r.id) ?? null;
      }
      if (method === 'POST' && !p[1]) {
        const r = this.request((body as { serviceRequestId: number }).serviceRequestId);
        this.owner(r);
        const c = this.contract(r);
        check(
          c.agreement && [RequestStatus.MATCHED, RequestStatus.IN_PROGRESS].includes(r.status),
          409,
          'Aceptá un presupuesto antes de pagar.',
        );
        let payment = this.state.payments.find((p) => p.serviceRequestId === r.id);
        if (!payment) {
          payment = {
            id: this.id(),
            serviceRequestId: r.id,
            agreementId: c.agreement!.id,
            amount: c.agreement!.totalAmount,
            feeAmount: 0,
            status: PaymentStatus.PENDING,
            checkoutUrl: null,
            protectionEndsAt: null,
            heldAt: null,
            settledAt: null,
          };
          this.state.payments.push(payment);
        }
        return payment;
      }
      if (p[2] === 'synchronize') {
        const payment = this.state.payments.find((p) => p.id === n);
        check(payment, 404, 'Pago inexistente.');
        this.owner(this.request(payment!.serviceRequestId));
        return payment;
      }
      if (p[2] === 'release')
        throw new DemoError(
          409,
          'La demo no ejecuta liquidaciones ni payouts. El dinero simulado permanece protegido.',
        );
    }
    if (p[0] === 'conversations') {
      const u = this.user();
      if (p[1] === 'my')
        return this.state.conversations
          .filter((c) => [c.clientUserId, c.workerUserId].includes(u.id))
          .map((c) => ({
            ...this.conversation(c),
            conversationId: c.id,
            lastMessage:
              this.state.messages.filter((m) => m.conversationId === c.id).at(-1) ?? null,
            updatedAt:
              this.state.messages.filter((m) => m.conversationId === c.id).at(-1)?.createdAt ??
              c.createdAt,
          }));
      if (p[1] === 'offerings') {
        this.role(Role.CLIENT);
        const o = this.state.offerings.find((o) => o.id === Number(p[2]) && o.active);
        check(
          o && o.workerUserId !== u.id,
          400,
          'Publicación no disponible para iniciar conversación.',
        );
        let c = this.state.conversations.find(
          (c) => c.serviceOfferingId === o!.id && c.clientUserId === u.id,
        );
        if (!c) {
          c = {
            id: this.id(),
            clientUserId: u.id,
            workerUserId: o!.workerUserId!,
            serviceOfferingId: o!.id,
            serviceRequestId: null,
            status: 'OPEN',
            createdAt: stamp(),
            closedAt: null,
          };
          this.state.conversations.push(c);
        }
        return this.conversation(c);
      }
      const c =
        p[1] === 'requests'
          ? this.state.conversations.find((c) => c.serviceRequestId === Number(p[2]))
          : this.state.conversations.find((c) => c.id === n);
      check(c, 404, 'Todavía no hay conversación.');
      const response = this.conversation(c!);
      if (p[2] === 'close') {
        check(c!.status==='OPEN',409,'La conversación ya está cerrada.');
        check(!c!.serviceRequestId || this.request(c!.serviceRequestId).status!==RequestStatus.IN_PROGRESS,409,'No se cierra el chat durante el trabajo.');
        c!.status = 'CLOSED';
        c!.closedAt = stamp();
      }
      if (p[2] === 'reopen') {
        check(c!.status==='CLOSED' && c!.serviceRequestId && this.request(c!.serviceRequestId).status===RequestStatus.DISPUTED,409,'El chat sólo puede reabrirse durante una disputa de la solicitud.');
        c!.status = 'OPEN';
        c!.closedAt = null;
      }
      return { ...response, status: c!.status, closedAt: c!.closedAt };
    }
    if (p[0] === 'messages') {
      if (p[1] === 'conversations') {
        const c = this.state.conversations.find((c) => c.id === Number(p[2]));
        check(c, 404, 'Conversación inexistente.');
        this.conversation(c!);
        if (get) return this.state.messages.filter((m) => m.conversationId === c!.id);
        const b = body as MessageRequest;
        check(
          c!.status === 'OPEN' && b.content?.trim() && (!b.type || b.type === MessageType.TEXT),
          400,
          'La conversación debe estar abierta y el mensaje ser texto.',
        );
        const u = this.user();
        const m = {
          id: this.id(),
          conversationId: c!.id,
          senderId: u.id,
          senderName: u.fullName,
          content: b.content.trim(),
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: stamp(),
          updatedAt: stamp(),
          deletedAt: null,
        };
        this.state.messages.push(m);
        return m;
      }
      const m = this.state.messages.find((m) => m.id === n);
      check(m && m.senderId === this.user().id, 403, 'Sólo podés borrar tus mensajes.');
      m!.status = MessageStatus.DELETED;
      m!.deletedAt = stamp();
      m!.updatedAt = stamp();
      m!.content = '';
      return m;
    }
    if (p[0] === 'reviews') {
      if (p[1] === 'workers') {
        const list = this.state.reviews.filter((r) => r.workerId === Number(p[2]));
        return p[3] === 'rating'
          ? list.length
            ? list.reduce((sum, r) => sum + r.rating, 0) / list.length
            : 0
          : list;
      }
      const r = this.request(Number(p[2]));
      this.participant(r);
      const existing = this.state.reviews.find((v) => v.serviceRequestId === r.id);
      if (get) return existing ?? null;
      this.owner(r);
      const b = body as ReviewRequest;
      check(
        r.status === RequestStatus.COMPLETED && !existing,
        409,
        'La contratación debe estar completada y sin reseña previa.',
      );
      check(
        Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5,
        400,
        'La puntuación debe estar entre 1 y 5.',
      );
      const review = {
        id: this.id(),
        rating: b.rating,
        comment: b.comment ?? null,
        createdAt: stamp(),
        serviceRequestId: r.id,
        workerId: r.selectedProposal!.workerId,
      };
      this.state.reviews.push(review);
      const list = this.state.reviews.filter((v) => v.workerId === review.workerId);
      this.state.workers.find((w) => w.id === review.workerId)!.rating =
        list.reduce((s, v) => s + v.rating, 0) / list.length;
      this.event(r, EventType.REVIEW_CREATED, 'Reseña publicada');
      return review;
    }
    if (p[0] === 'disputes') {
      if (p[1] === 'my') {
        const u = this.user();
        return this.state.disputes.filter((d) => {
          const r = this.request(d.serviceRequestId);
          return (
            r.clientUserId === u.id ||
            this.state.workers.find((w) => w.id === r.selectedProposal?.workerId)?.userId === u.id
          );
        });
      }
      if (p[1] === 'requests') {
        const r = this.request(Number(p[2]));
        this.participant(r);
        const existing = this.state.disputes.find((d) => d.serviceRequestId === r.id);
        if (get) return existing ?? null;
        const b = body as DisputeRequest;
        const payment = this.state.payments.find((p) => p.serviceRequestId === r.id);
        check(
          !existing &&
            [RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED].includes(r.status) &&
            payment?.status === PaymentStatus.HELD &&
            (!payment.protectionEndsAt || Date.parse(payment.protectionEndsAt) > Date.now()),
          409,
          'La contratación no admite un nuevo reclamo.',
        );
        check(b.description?.trim(), 400, 'Describí el reclamo ficticio.');
        const d = {
          id: this.id(),
          serviceRequestId: r.id,
          openedByUserId: this.user().id,
          ...b,
          status: DisputeStatus.OPEN,
          resolution: null,
          resolutionComment: null,
          createdAt: stamp(),
          reviewStartedAt: null,
          resolvedAt: null,
          cancelledAt: null,
        };
        this.state.disputes.push(d);
        r.status = RequestStatus.DISPUTED;
        this.event(r, EventType.DISPUTE_OPENED, 'Reclamo abierto');
        return d;
      }
      const d = this.state.disputes.find((d) => d.id === n);
      check(d, 404, 'Reclamo inexistente.');
      this.participant(this.request(d!.serviceRequestId));
      if (p[2] === 'evidence') {
        if (get) return this.state.evidence.filter((e) => e.disputeId === n);
        const b = body as DisputeEvidenceRequest;
        check(b.fileUrl?.startsWith('data:image/'), 400, 'Sólo imágenes locales en la demo.');
        const e = {
          id: this.id(),
          disputeId: n,
          uploadedByUserId: this.user().id,
          uploadedByName: this.user().fullName,
          fileUrl: b.fileUrl,
          description: b.description ?? null,
          createdAt: stamp(),
        };
        this.state.evidence.push(e);
        return e;
      }
      return d;
    }
    throw new DemoError(501, 'Esta operación no está disponible en la demo local.');
  }
  confirmPayment(requestId: number) {
    const result = this.queue.then(() => this.executeConfirmation(requestId));
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async executeConfirmation(requestId: number) {
    const snapshot = structuredClone(this.state);
    try {
      const r = this.request(requestId);
      this.owner(r);
      const p = this.state.payments.find((p) => p.serviceRequestId === requestId),
        c = this.contract(r);
      check(
        p &&
          c.agreement &&
          p.agreementId === c.agreement.id &&
          p.amount === c.agreement.totalAmount,
        409,
        'El pago no corresponde al acuerdo.',
      );
      if (p!.status === PaymentStatus.HELD) return structuredClone(p!);
      check(p!.status === PaymentStatus.PENDING, 409, 'Pago no confirmable.');
      p!.status = PaymentStatus.HELD;
      p!.heldAt = stamp();
      this.event(r, EventType.PAYMENT_CONFIRMED, 'Pago simulado confirmado, protegido por Fixy');
      this.save();
      return structuredClone(p!);
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }
}

