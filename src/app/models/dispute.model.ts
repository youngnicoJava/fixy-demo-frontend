import { DisputeReason } from './enums/dispute-reason.enum';
import { DisputeResolution } from './enums/dispute-resolution.enum';
import { DisputeStatus } from './enums/dispute-status.enum';

export interface DisputeRequest {
  reason: DisputeReason;
  description: string;
}

export interface DisputeResponse {
  id: number;
  serviceRequestId: number;
  openedByUserId: number;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionComment: string | null;
  createdAt: string;
  reviewStartedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
}

export interface DisputeEvidenceRequest {
  fileUrl: string;
  description?: string;
}

export interface DisputeEvidenceResponse {
  id: number;
  disputeId: number;
  uploadedByUserId: number;
  uploadedByName: string;
  fileUrl: string;
  description: string | null;
  createdAt: string;
}

export interface DisputeResolutionRequest {
  resolution: DisputeResolution;
  resolutionComment: string;
}
