import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ServiceRequest,
  ServiceRequestRequest,
  WorkerProposal,
  WorkerProposalRequest,
  ServiceRequestEvent,
  ServiceRequestComment,
  ServiceRequestCommentRequest,
} from '../../models/request.model';

import { Category } from '../../models/enums/category.enum';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/requests`;

  // CLIENT — publicar solicitud
  createRequest(request: ServiceRequestRequest): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(this.apiUrl, request);
  }

  // CLIENT — mis solicitudes
  getMyRequests(): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(`${this.apiUrl}/my`);
  }

  // CLIENT / WORKER — detalle
  getRequestById(requestId: number): Observable<ServiceRequest> {
    return this.http.get<ServiceRequest>(`${this.apiUrl}/${requestId}`);
  }

  // WORKER — solicitudes abiertas por categoría
  getOpenRequests(category: Category): Observable<ServiceRequest[]> {
    const params = new HttpParams().set('category', category);

    return this.http.get<ServiceRequest[]>(`${this.apiUrl}/open`, { params });
  }

  // WORKER — enviar propuesta
  createProposal(requestId: number, request: WorkerProposalRequest): Observable<WorkerProposal> {
    return this.http.post<WorkerProposal>(`${this.apiUrl}/${requestId}/proposals`, request);
  }

  // CLIENT — seleccionar propuesta / match
  selectProposal(requestId: number, proposalId: number): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(
      `${this.apiUrl}/${requestId}/proposals/${proposalId}/select`,
      {},
    );
  }

  // WORKER — iniciar servicio
  startRequest(requestId: number): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.apiUrl}/${requestId}/start`, {});
  }

  // CLIENT — completar servicio
  completeRequest(requestId: number): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.apiUrl}/${requestId}/complete`, {});
  }

  // CLIENT — cancelar solicitud
  cancelRequest(requestId: number): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.apiUrl}/${requestId}/cancel`, {});
  }

  withdrawProposal(requestId: number, proposalId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${requestId}/proposals/${proposalId}/withdraw`,
      {},
    );
  }

  getRequestEvents(requestId: number): Observable<ServiceRequestEvent[]> {
    return this.http.get<ServiceRequestEvent[]>(`${this.apiUrl}/${requestId}/events`);
  }

  getRequestComments(requestId: number): Observable<ServiceRequestComment[]> {
    return this.http.get<ServiceRequestComment[]>(`${this.apiUrl}/${requestId}/comments`);
  }

  addRequestComment( requestId: number, request: ServiceRequestCommentRequest ): Observable<ServiceRequestComment> {
    return this.http.post<ServiceRequestComment>(`${this.apiUrl}/${requestId}/comments`, request);
  }

  // WORKER — mis solicitudes / servicios
getMyWorkerRequests(): Observable<ServiceRequest[]> {
  return this.http.get<ServiceRequest[]>(`${this.apiUrl}/worker/my`);
  }
}
