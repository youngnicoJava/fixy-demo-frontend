import { Injectable, inject } from '@angular/core';
import type { SavedAddressRequest, ClientProfile } from '../../models/client.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientProfileService {
  //DI
  private readonly http = inject(HttpClient);
  //API URL
  private readonly API = `${environment.apiUrl}/client`;

  getProfile(): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.API}/profile`);
  }

  addAddress(request: SavedAddressRequest): Observable<ClientProfile> {
    return this.http.post<ClientProfile>(`${this.API}/addresses`, request);
  }

  setActiveAddress(addressId: number): Observable<ClientProfile> {
    return this.http.patch<ClientProfile>(`${this.API}/addresses/${addressId}/active`, {});
  }

  removeAddress(addressId: number): Observable<ClientProfile> {
    return this.http.delete<ClientProfile>(`${this.API}/addresses/${addressId}`);
  }

  updateAddress(addressId: number, request: SavedAddressRequest): Observable<ClientProfile> {
    return this.http.put<ClientProfile>(`${this.API}/addresses/${addressId}`, request);
  }
}
