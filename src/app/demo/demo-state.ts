import { User } from '../models/user.model';
import { ServiceRequest, ServiceRequestComment } from '../models/request.model';
import { WorkerProfile, WorkerServiceOffering } from '../models/worker.profile.model';
import { ClientProfile } from '../models/client.model';
import { ContractSummary } from '../models/contract.model';
import { PaymentResponse } from '../models/payment.model';
import { ReviewResponse } from '../models/review.model';
import { DisputeResponse, DisputeEvidenceResponse } from '../models/dispute.model';
import { MessageResponse } from '../models/messaging.model';
import { Role } from '../models/enums/Role.enum';
import { Category } from '../models/enums/category.enum';
import { WorkerStatus } from '../models/enums/worker-status.enum';
import { ServiceRequestStatus } from '../models/enums/service-request-status.enum';
import { ProposalStatus } from '../models/enums/proposal-status.enum';
import { PaymentStatus } from '../models/enums/payment-status.enum';
import { MessageType } from '../models/enums/message-type.enum';
import { MessageStatus } from '../models/enums/message-status.enum';
import { ServiceRequestEventType } from '../models/enums/service-request-event-type.enum';
import { PriceType } from '../models/enums/price-type.enum';
export interface DemoConversation {
  id: number;
  clientUserId: number;
  workerUserId: number;
  serviceRequestId: number | null;
  serviceOfferingId: number | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
}
export interface DemoState {
  version: 1;
  nextId: number;
  sessionId: number | null;
  users: User[];
  credentials: Record<number, { salt: string; hash: string }>;
  clients: Record<number, ClientProfile>;
  workers: (WorkerProfile & { userId: number })[];
  offerings: WorkerServiceOffering[];
  requests: (ServiceRequest & { clientUserId: number })[];
  contracts: Record<number, ContractSummary>;
  payments: PaymentResponse[];
  conversations: DemoConversation[];
  messages: MessageResponse[];
  comments: Record<number, ServiceRequestComment[]>;
  reviews: (ReviewResponse & { serviceRequestId: number; workerId: number })[];
  disputes: DisputeResponse[];
  evidence: DisputeEvidenceResponse[];
}
export const DEMO_KEY = 'fixy-demo-v1';
export const DEMO_PASSWORD = 'Demo123!';
export const DEMO_USERS = { client: 'cliente@fixy.demo', worker: 'trabajador@fixy.demo' };
export function seedState(): DemoState {
  const now = new Date().toISOString();
  const users: User[] = [
    {
      id: 1,
      email: DEMO_USERS.client,
      fullName: 'José María Paz',
      phoneNumber: '+541155550101',
      role: Role.CLIENT,
    },
    {
      id: 2,
      email: DEMO_USERS.worker,
      fullName: 'Luca Prodan',
      phoneNumber: '+541155550102',
      role: Role.WORKER,
    },
    {
      id: 3,
      email: 'sofia@fixy.demo',
      fullName: 'Sofía Torres',
      phoneNumber: '+541155550103',
      role: Role.CLIENT,
    },
    {
      id: 4,
      email: 'camila@fixy.demo',
      fullName: 'Camila Ríos',
      phoneNumber: '+541155550104',
      role: Role.WORKER,
    },
  ];
  const clients = Object.fromEntries(
    users.map((u) => [
      u.id,
      {
        id: u.id,
        fullName: u.fullName,
        savedAddresses: [
          {
            id: u.id,
            label: 'Casa',
            labelType: 'home' as const,
            address: 'Av. Corrientes 1200, Buenos Aires (ubicación ficticia)',
            latitude: -34.6037,
            longitude: -58.3816,
          },
        ],
        activeAddress: {
          id: u.id,
          label: 'Casa',
          labelType: 'home' as const,
          address: 'Av. Corrientes 1200, Buenos Aires (ubicación ficticia)',
          latitude: -34.6037,
          longitude: -58.3816,
        },
      },
    ]),
  );
  const workers = [users[1], users[3]].map((u, i) => ({
    id: u.id,
    userId: u.id,
    fullName: u.fullName,
    address: clients[u.id].activeAddress.address,
    labelType: 'home' as const,
    customLabel: null,
    floor: null,
    apartment: null,
    description: i
      ? 'Electricista con experiencia en instalaciones domiciliarias.'
      : 'Plomería y mantenimiento del hogar. Presupuestos claros y atención cercana.',
    categories: i ? [Category.ELECTRICIDAD, Category.REPARACION_PC] : Object.values(Category),
    profilePhotoUrl: null,
    rating: null,
    status: WorkerStatus.VERIFIED,
    hasCertificate: true,
    verified: true,
    latitude: -34.6037,
    longitude: -58.3816,
  }));
  const offerings = [
    {
      id: 11,
      workerId: 2,
      title: 'Reparación de cañerías y pérdidas',
      description: 'Diagnóstico, reparación y mantenimiento de instalaciones de agua.',
      category: Category.PLOMERIA,
      basePrice: 55000,
    },
    {
      id: 12,
      workerId: 4,
      title: 'Instalaciones eléctricas del hogar',
      description: 'Revisión de circuitos, enchufes y seguridad de instalaciones.',
      category: Category.ELECTRICIDAD,
      basePrice: 42000,
    },
    {
      id: 13,
      workerId: 2,
      title: 'Pintura de ambientes',
      description: 'Preparación y pintura interior. Cotización según superficie.',
      category: Category.PINTURA,
      basePrice: 80000,
    },
  ].map((o) => {
    const w = workers.find((w) => w.id === o.workerId)!;
    return {
      ...o,
      imageUrls: [],
      priceType: PriceType.NEGOTIABLE,
      workerUserId: w.userId,
      workerFullName: w.fullName,
      workerProfilePhotoUrl: null,
      workerRating: null,
      workerStatus: w.status,
      workerVerified: true,
      active: true,
      featured: true,
      createdAt: now,
      updatedAt: now,
    };
  });
  const requests = [
    {
      id: 101,
      title: 'Reparar una pérdida en la cocina',
      description: 'La cañería debajo de la pileta pierde agua. Necesito revisión y presupuesto.',
      category: Category.PLOMERIA,
      clientUserId: 1,
    },
    {
      id: 102,
      title: 'Instalar una lámpara en el living',
      description: 'Instalación de una lámpara y revisión del interruptor.',
      category: Category.ELECTRICIDAD,
      clientUserId: 3,
    },
  ].map((r) => ({
    ...r,
    address: clients[r.clientUserId].activeAddress.address,
    latitude: -34.6037,
    longitude: -58.3816,
    status: ServiceRequestStatus.OPEN,
    createdAt: now,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    matchedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    proposals: [],
    selectedProposal: null,
    events: [],
  }));
  const state: DemoState = {
    version: 1,
    nextId: 200,
    sessionId: null,
    users,
    credentials: {},
    clients,
    workers,
    offerings,
    requests,
    contracts: {},
    payments: [],
    conversations: [],
    messages: [],
    comments: {},
    reviews: [],
    disputes: [],
    evidence: [],
  };
  const stages = [
    { id: 103, status: ServiceRequestStatus.MATCHED, title: 'Revisar la presión de agua' },
    { id: 104, status: ServiceRequestStatus.IN_PROGRESS, title: 'Reparación del baño' },
    { id: 105, status: ServiceRequestStatus.COMPLETED, title: 'Mantenimiento de la cocina' },
  ];
  for (const stage of stages) {
    const historical = new Date(Date.now() - 7 * 86400000).toISOString();
    const proposal = {
      id: stage.id + 1000,
      workerId: 2,
      workerFullName: 'Luca Prodan',
      workerRating: 5,
      workerStatus: WorkerStatus.VERIFIED,
      message: 'Revisión y reparación acordadas',
      estimatedPrice: 55000,
      priceType: PriceType.FIXED,
      status: ProposalStatus.ACCEPTED,
    };
    const r = {
      ...state.requests[0],
      ...stage,
      proposals: [proposal],
      selectedProposal: proposal,
      createdAt: historical,
      matchedAt: historical,
      startedAt: stage.status === ServiceRequestStatus.MATCHED ? null : historical,
      completedAt: stage.status === ServiceRequestStatus.COMPLETED ? historical : null,
      events: [
        {
          id: stage.id + 2000,
          type: ServiceRequestEventType.REQUEST_MATCHED,
          actorUserId: 1,
          actorName: 'José María Paz',
          createdAt: historical,
          description: 'Profesional seleccionado (fixture ficticio)',
        },
      ],
    };
    state.requests.push(r);
    state.contracts[r.id] = {
      serviceRequestId: r.id,
      title: r.title,
      clientId: 1,
      workerUserId: 2,
      workerName: 'Luca Prodan',
      quotes: [
        {
          id: r.id + 3000,
          revision: 1,
          workerId: 2,
          laborAmount: 40000,
          materialsAmount: 15000,
          totalAmount: 55000,
          scope: proposal.message,
          status: 'ACCEPTED',
          createdAt: historical,
          decidedAt: historical,
        },
      ],
      agreement: {
        id: r.id + 4000,
        quoteId: r.id + 3000,
        clientId: 1,
        workerId: 2,
        totalAmount: 55000,
        scope: proposal.message,
        protectionPeriodSeconds: 259200,
        acceptedAt: historical,
        status: r.status,
      },
      visit: null,
    };
    state.payments.push({
      id: r.id + 5000,
      serviceRequestId: r.id,
      amount: 55000,
      feeAmount: 0,
      status:
        stage.status === ServiceRequestStatus.MATCHED
          ? PaymentStatus.PENDING
          : stage.status === ServiceRequestStatus.COMPLETED
            ? PaymentStatus.RELEASED
            : PaymentStatus.HELD,
      checkoutUrl: null,
      agreementId: r.id + 4000,
      protectionEndsAt:
        stage.status === ServiceRequestStatus.COMPLETED
          ? new Date(Date.now() - 4 * 86400000).toISOString()
          : null,
      heldAt: stage.status === ServiceRequestStatus.MATCHED ? null : historical,
      settledAt:
        stage.status === ServiceRequestStatus.COMPLETED
          ? new Date(Date.now() - 3 * 86400000).toISOString()
          : null,
    });
    state.conversations.push({
      id: r.id + 6000,
      clientUserId: 1,
      workerUserId: 2,
      serviceRequestId: r.id,
      serviceOfferingId: null,
      status: 'OPEN',
      createdAt: historical,
      closedAt: null,
    });
    state.messages.push({
      id: r.id + 7000,
      conversationId: r.id + 6000,
      senderId: 2,
      senderName: 'Luca Prodan',
      content: 'Hola, coordinemos los detalles del trabajo.',
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
      createdAt: historical,
      updatedAt: historical,
      deletedAt: null,
    });
    if (stage.status === ServiceRequestStatus.COMPLETED) {
      state.reviews.push({
        id: stage.id + 8000,
        rating: 5,
        comment: 'Trabajo prolijo y buena comunicación (reseña ficticia).',
        createdAt: historical,
        serviceRequestId: r.id,
        workerId: 2,
      });
      state.workers[0].rating = 5;
    }
  }
  return state;
}
