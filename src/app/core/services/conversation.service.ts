import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConversationResponse, ConversationSummaryResponse } from '../../models/messaging.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/conversations`;

  // Obtener conversación de un request
  getConversationByRequest(requestId: number): Observable<ConversationResponse> {
    return this.http.get<ConversationResponse>(`${this.apiUrl}/requests/${requestId}`);
  }

  // Obtener conversación por ID
  getConversation(conversationId: number): Observable<ConversationResponse> {
    return this.http.get<ConversationResponse>(`${this.apiUrl}/${conversationId}`);
  }

  // Cerrar conversación
  closeConversation(conversationId: number): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.apiUrl}/${conversationId}/close`, null);
  }

  // Reabrir conversación
  reopenConversation(conversationId: number): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.apiUrl}/${conversationId}/reopen`, null);
  }

  // Obtener conversaciones
  getMyConversations(): Observable<ConversationSummaryResponse[]> {
    return this.http.get<ConversationSummaryResponse[]>(`${this.apiUrl}/my`);
  }

  // Crear conversación a partir de una publicacion
  createFromOffering(offeringId: number): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.apiUrl}/offerings/${offeringId}`, {});
  }
}
