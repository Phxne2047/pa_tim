import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliveryRouteResult } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class DeliveryRouteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.directApiUrl}/delivery-routes`;

  optimize(): Observable<DeliveryRouteResult> {
    return this.http.post<unknown>(`${this.apiUrl}/optimize`, {}).pipe(
      timeout({ first: 45_000 }),
      map((response) => this.normalizeDeliveryRouteResult(response)),
    );
  }

  getLatest(): Observable<DeliveryRouteResult> {
    return this.http.get<unknown>(`${this.apiUrl}/all`).pipe(
      timeout({ first: 15_000 }),
      map((response) => this.normalizeDeliveryRouteResult(response)),
    );
  }

  getRoadGeometry(points: Array<{ latitude: number | string; longitude: number | string }>): Observable<OsrmRouteResponse> {
    const coordinates = points
      .map((point) => `${Number(point.longitude)},${Number(point.latitude)}`)
      .join(';');
    return this.http.get<OsrmRouteResponse>(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    ).pipe(timeout({ first: 12_000 }));
  }

  private normalizeDeliveryRouteResult(value: unknown): DeliveryRouteResult {
    const response = this.isRecord(value) && this.isRecord(value['data']) ? value['data'] : value;

    if (!this.isRecord(response)) {
      throw new Error('รูปแบบข้อมูลเส้นทางจาก API ไม่ถูกต้อง');
    }

    const shop = response['shop'];
    const financialDashboard = response['financial_dashboard'];
    const routes = response['routes'];

    if (!this.isRecord(shop) || !this.isRecord(financialDashboard) || !Array.isArray(routes)) {
      throw new Error('รูปแบบข้อมูลเส้นทางจาก API ไม่ครบถ้วน');
    }

    return response as unknown as DeliveryRouteResult;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

export interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}
