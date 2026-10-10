import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  DisputeResponse as Dispute,
  DisputeRequest,
  DisputeEvidenceResponse as DisputeEvidence,
  DisputeEvidenceRequest,
} from '../../models/dispute.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DisputeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/disputes`;

  // CLIENT / WORKER — abrir disputa
  openDispute(requestId: number, request: DisputeRequest): Observable<Dispute> {
    return this.http.post<Dispute>(`${this.apiUrl}/requests/${requestId}`, request);
  }

  // Obtener disputa por ID
  getDispute(disputeId: number): Observable<Dispute> {
    return this.http.get<Dispute>(`${this.apiUrl}/${disputeId}`);
  }

  // Obtener disputa asociada a request
  getDisputeByRequest(requestId: number): Observable<Dispute | null> {
    return this.http.get<Dispute | null>(`${this.apiUrl}/requests/${requestId}`);
  }

  // Mis disputas
  getMyDisputes(): Observable<Dispute[]> {
    return this.http.get<Dispute[]>(`${this.apiUrl}/my`);
  }

  // Agregar evidencia
  addEvidence(disputeId: number, request: DisputeEvidenceRequest): Observable<DisputeEvidence> {
    return this.http.post<DisputeEvidence>(`${this.apiUrl}/${disputeId}/evidence`, request);
  }

  // Obtener evidencias
  getEvidence(disputeId: number): Observable<DisputeEvidence[]> {
    return this.http.get<DisputeEvidence[]>(`${this.apiUrl}/${disputeId}/evidence`);
  }
}
