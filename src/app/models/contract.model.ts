import { ServiceRequestStatus } from './enums/service-request-status.enum';
export type QuoteStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
export interface ServiceQuote {
  id: number;
  revision: number;
  workerId: number;
  laborAmount: number;
  materialsAmount: number;
  totalAmount: number;
  scope: string;
  status: QuoteStatus;
  createdAt: string;
  decidedAt: string | null;
}
export interface ServiceAgreement {
  id: number;
  quoteId: number;
  clientId: number;
  workerId: number;
  totalAmount: number;
  scope: string;
  protectionPeriodSeconds: number;
  acceptedAt: string;
  status: ServiceRequestStatus;
}
export interface ServiceVisit {
  id: number;
  price: number | null;
  status: 'REQUIRED' | 'SCHEDULED' | 'COMPLETED';
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
}
export interface ContractSummary {
  serviceRequestId: number;
  title: string;
  clientId: number;
  workerUserId: number | null;
  workerName: string | null;
  quotes: ServiceQuote[];
  agreement: ServiceAgreement | null;
  visit: ServiceVisit | null;
}
export interface QuoteInput {
  laborAmount: number;
  materialsAmount: number;
  scope: string;
}
export interface VisitInput {
  price: number;
  scheduledAt: string;
  notes: string;
}
