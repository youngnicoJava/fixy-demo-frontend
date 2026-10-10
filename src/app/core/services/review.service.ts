import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ReviewResponse, ReviewRequest } from '../../models/review.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reviews`;

  getByRequest(id: number): Observable<ReviewResponse | null> {
    return this.http.get<ReviewResponse | null>(this.apiUrl + '/requests/' + id);
  }
  // CLIENT — crear review
  createReview(requestId: number, request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${this.apiUrl}/requests/${requestId}`, request);
  }

  // PÚBLICO — reviews de worker
  getWorkerReviews(workerProfileId: number): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${this.apiUrl}/workers/${workerProfileId}`);
  }

  // PÚBLICO — rating promedio
  getWorkerAverageRating(workerProfileId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/workers/${workerProfileId}/rating`);
  }
}
