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

  // 1. ดึงออเดอร์ทั้งหมดพร้อมข้อมูลลูกค้าและระยะทางจาก Database จริง
  getOrders(): Observable<DbOrder[]> {
    return this.http.get<DbOrder[]>(this.apiUrl).pipe(
      timeout({ first: 15_000 }),
      retry({ count: 2, delay: 1_000 }),
    );
  }

  // 2. ดึงออเดอร์ราย ID
  getOrderById(id: string | number): Observable<DbOrder> {
    return this.http.get<DbOrder>(`${this.apiUrl}/${id}`);
  }

  // 3. แสดงออเดอร์ในระยะกำหนด (ค่าเริ่มต้น 2.0 กม.)
  getNearbyOrders(km: number = 2.0): Observable<DbOrder[]> {
    const params = new HttpParams().set('km', km.toString());
    return this.http.get<DbOrder[]>(`${this.apiUrl}/near`, { params });
  }

  // 4. ค้นหาออเดอร์ตามเงื่อนไข
  searchOrders(criteria: { id?: string; customer_name?: string; menu?: string; status?: string }): Observable<DbOrder[]> {
    let params = new HttpParams();
    Object.entries(criteria).forEach(([key, val]) => {
      if (val) params = params.set(key, val);
    });
    return this.http.get<DbOrder[]>(`${this.apiUrl}/search`, { params });
  }

  // 5. เพิ่มออเดอร์ใหม่ (1-3 กล่อง) ลง Database
  createOrder(dto: CreateOrderDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  // 6. จำลองสุ่มออเดอร์ 20-30 รายการลง Database จริง (POST /orders/mock)
  simulateOrders(count: number = 25, clearExisting: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mock`, { count, clear_existing: clearExisting });
  }

  // 7. แก้ไขข้อมูลออเดอร์ทั้งหมดตาม ID
  updateOrder(id: string | number, dto: Partial<DbOrder>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 8. แก้ไขจำนวนกล่องหรือสถานะเฉพาะฟิลด์
  patchOrder(id: string | number, dto: { boxes?: number; status?: string; menu?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 9. ลบออเดอร์เดี่ยว 1 รายการจาก Database
  deleteOrder(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // 10. ล้างออเดอร์ทั้งหมดในระบบ Database
  clearAllOrders(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/all`);
  }
}
