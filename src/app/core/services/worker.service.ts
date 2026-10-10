import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { Category } from '../../models/enums/category.enum';
import {
  WorkerProfile,
  WorkerProfileRequest,
  WorkerServiceOffering,
  WorkerServiceOfferingRequest,
} from '../../models/worker.profile.model';

import {
  WorkerSavedAddress,
  WorkerAddressRequest,
  WorkerAddressProfileResponse,
} from '../../models/worker.address.model';

@Injectable({
  providedIn: 'root',
})
export class WorkerService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrl}/worker`;

  // =========================================================
  // WORKER PROFILE — PUBLIC
  // =========================================================

  getVerifiedByCategory(category: Category): Observable<WorkerProfile[]> {
    return this.http.get<WorkerProfile[]>(`${this.API_URL}/public`, {
      params: { category },
    });
  }

  getById(workerId: number): Observable<WorkerProfile> {
    return this.http.get<WorkerProfile>(`${this.API_URL}/public/${workerId}`);
  }

  // =========================================================
  // WORKER PROFILE — PRIVATE
  // =========================================================

  createProfile(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/profile`, data);
  }

  getProfile(): Observable<WorkerProfile> {
    return this.http.get<WorkerProfile>(`${this.API_URL}/profile`);
  }

  // =========================================================
  // SERVICE OFFERINGS — WORKER
  // =========================================================

  createServiceOffering(data: WorkerServiceOfferingRequest): Observable<WorkerServiceOffering> {
    return this.http.post<WorkerServiceOffering>(`${this.API_URL}/services`, data);
  }

  getMyServiceOfferings(): Observable<WorkerServiceOffering[]> {
    return this.http.get<WorkerServiceOffering[]>(`${this.API_URL}/services/my`);
  }

  updateServiceOffering(
    offeringId: number,
    data: WorkerServiceOfferingRequest,
  ): Observable<WorkerServiceOffering> {
    return this.http.put<WorkerServiceOffering>(`${this.API_URL}/services/${offeringId}`, data);
  }

  deactivateServiceOffering(offeringId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/services/${offeringId}`);
  }

  activateServiceOffering(offeringId: number): Observable<WorkerServiceOffering> {
    return this.http.patch<WorkerServiceOffering>(
      `${this.API_URL}/services/${offeringId}/activate`,
      {},
    );
  }

  // =========================================================
  // SERVICE OFFERINGS — PUBLIC
  // =========================================================

  getServiceOfferingById(offeringId: number): Observable<WorkerServiceOffering> {
    return this.http.get<WorkerServiceOffering>(`${this.API_URL}/services/public/${offeringId}`);
  }

  getServiceOfferingsByCategory(category: Category): Observable<WorkerServiceOffering[]> {
    return this.http.get<WorkerServiceOffering[]>(
      `${this.API_URL}/services/public/category/${category}`,
    );
  }

  getFeaturedServiceOfferings(limit = 8): Observable<WorkerServiceOffering[]> {
    return this.http.get<WorkerServiceOffering[]>(`${this.API_URL}/services/public/featured`, {
      params: { limit },
    });
  }

  getFeaturedServiceOfferingsByCategory(
    category: Category,
    limit = 8,
  ): Observable<WorkerServiceOffering[]> {
    return this.http.get<WorkerServiceOffering[]>(
      `${this.API_URL}/services/public/featured/category/${category}`,
      {
        params: { limit },
      },
    );
  }

  uploadImages(files: File[]): Observable<string[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.http.post<string[]>(`${environment.apiUrl}/images/upload/multiple`, formData);
  }

  updateProfile(data: WorkerProfileRequest): Observable<WorkerProfile> {
    return this.http.put<WorkerProfile>(`${this.API_URL}/profile`, data);
  }

  getMyAddresses(): Observable<WorkerAddressProfileResponse> {
    return this.http.get<WorkerAddressProfileResponse>(`${this.API_URL}/addresses`);
  }

  addAddress(data: WorkerAddressRequest): Observable<WorkerAddressProfileResponse> {
    return this.http.post<WorkerAddressProfileResponse>(`${this.API_URL}/addresses`, data);
  }

  updateAddress(
    addressId: number,
    data: WorkerAddressRequest,
  ): Observable<WorkerAddressProfileResponse> {
    return this.http.put<WorkerAddressProfileResponse>(
      `${this.API_URL}/addresses/${addressId}`,
      data,
    );
  }

  setActiveAddress(addressId: number): Observable<WorkerAddressProfileResponse> {
    return this.http.patch<WorkerAddressProfileResponse>(
      `${this.API_URL}/addresses/${addressId}/active`,
      {},
    );
  }

  removeAddress(addressId: number): Observable<WorkerAddressProfileResponse> {
    return this.http.delete<WorkerAddressProfileResponse>(`${this.API_URL}/addresses/${addressId}`);
  }
}
