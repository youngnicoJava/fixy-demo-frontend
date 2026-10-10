import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LocationResult } from '../../models/location.model';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly apiUrl = `${environment.apiUrl}/location`;
  private readonly http = inject(HttpClient);

  //##HERE GEOLOCATION API ENDPOINTS

  search(query: string, lat?: number | null, lng?: number | null): Observable<LocationResult[]> {
    let url = `${this.apiUrl}/search?q=${encodeURIComponent(query)}`;

    if (lat != null && lng != null) {
      url += `&lat=${lat}&lng=${lng}`;
    }

    return this.http.get<LocationResult[]>(url);
  }

  geocode(address: string): Observable<LocationResult> {
    return this.http.get<LocationResult>(
      `${this.apiUrl}/geocode?address=${encodeURIComponent(address)}`,
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<LocationResult> {
    return this.http.get<LocationResult>(`${this.apiUrl}/reverse-geocode?lat=${lat}&lng=${lng}`);
  }
}
