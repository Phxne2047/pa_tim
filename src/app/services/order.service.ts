import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, retry, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, CreateOrderDto } from '../models/order.model';

export type DbOrder = Order;


@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.directApiUrl}/orders`;

  getOrders(): Observable<DbOrder[]> {
    return this.http.get<DbOrder[]>(this.apiUrl).pipe(
      timeout({ first: 15_000 }),
      retry({ count: 2, delay: 1_000 }),
    );
  }

  getOrderById(id: string | number): Observable<DbOrder> {
    return this.http.get<DbOrder>(`${this.apiUrl}/${id}`);
  }

  getNearbyOrders(km: number = 3.0): Observable<DbOrder[]> {
    const params = new HttpParams().set('km', km.toString());
    return this.http.get<DbOrder[]>(`${this.apiUrl}/near`, { params });
  }

  searchOrders(criteria: { id?: string; customer_name?: string; menu?: string; status?: string }): Observable<DbOrder[]> {
    let params = new HttpParams();
    Object.entries(criteria).forEach(([key, val]) => {
      if (val) params = params.set(key, val);
    });
    return this.http.get<DbOrder[]>(`${this.apiUrl}/search`, { params });
  }

  createOrder(dto: CreateOrderDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  simulateOrders(count: number = 25, clearExisting: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mock`, { count, clear_existing: clearExisting });
  }

  updateOrder(id: string | number, dto: Partial<DbOrder>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  patchOrder(id: string | number, dto: { boxes?: number; status?: string; menu?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, dto);
  }

  deleteOrder(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  clearAllOrders(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/all`);
  }
}
