import { Category } from './enums/category.enum';
import { PriceType } from './enums/price-type.enum';
import { ProposalStatus } from './enums/proposal-status.enum';
import { ServiceRequestStatus } from './enums/service-request-status.enum';
import { ServiceRequestEventType } from './enums/service-request-event-type.enum';
import { WorkerStatus } from './enums/worker-status.enum';

export interface ServiceRequest {
  id: number;
  title: string;
  description: string;
  category: Category;
  address: string;
  latitude: number;
  longitude: number;
  status: ServiceRequestStatus;
  createdAt: string;
  expiresAt: string;
  matchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  proposals: WorkerProposal[];
  selectedProposal: WorkerProposal | null;
  events: ServiceRequestEvent[];
}

export interface ServiceRequestEvent {
  id: number;
  type: ServiceRequestEventType;
  actorUserId: number | null;
  actorName: string;
  createdAt: string;
  description: string;
}

export interface ServiceRequestRequest {
  title: string;
  description: string;
  category: Category;
}

export interface WorkerProposal {
  id: number;
  workerId: number;
  workerFullName: string;
  workerRating: number;
  workerStatus: WorkerStatus;
  message: string;
  estimatedPrice: number;
  priceType: PriceType;
  requiresVisit?: boolean;
  status: ProposalStatus;
}

export interface WorkerProposalRequest {
  requiresVisit?: boolean;
  message: string;
  estimatedPrice: number;
  priceType: PriceType;
}

//comments: new entities from backend, model apply interfaces for service request comments 23/06/2026
export interface ServiceRequestComment {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;

  parentCommentId: number | null;
  requestAuthor: boolean;
}

export interface ServiceRequestCommentRequest {
  parentCommentId?: number | null;
  content: string;
}
