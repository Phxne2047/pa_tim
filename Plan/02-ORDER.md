---
tags:
  - member-2
  - order-management
  - simulation
  - api-calling
  - crud
title: คู่มือปฏิบัติงานฉบับละเอียด - สมาชิกคนที่ 2 (ระบบจัดการออเดอร์และการจำลองข้อมูล)
---

# 📦 คู่มือปฏิบัติงานฉบับละเอียด: สมาชิกคนที่ 2
> [!INFO] **ส่วนงานที่รับผิดชอบ:** ระบบจัดการรายการออเดอร์ & ระบบจำลองข้อมูลสั่งซื้อ (Order Management & Simulation)  
> **เอกสารอ้างอิงหลัก:** [[PROJECT_PLAN|แผนแม่บท PaTim]] | **โครงสร้าง DB:** [[DATABASE_SCHEMA|ผัง ER Diagram]] | **API:** [[API_DOCUMENTATION|เอกสาร API]]

---

## 🏢 1. ภาพรวมหน้าที่และสิ่งที่โปรเจกต์ต้องเป็น (Project Overview & UI Concept)

### 1.1 หน้าที่ของสมาชิกคนที่ 2 ในทีม
คุณมีหน้าที่รับผิดชอบพัฒนาระบบจัดการรายการสั่งซื้อข้าวกล่องสำหรับ **เจ้าของร้าน** ซึ่งในชีวิตจริงช่วง 10:00 น. จะมีออเดอร์เข้ามาพร้อมกัน 20–30 รายการ โดยหน้าที่สำคัญที่สุดของคุณคือ:
1. การควบคุมกฎข้อบังคับทางธุรกิจ: **ลูกค้าแต่ละคนสั่งอาหารได้ไม่เกิน 3 กล่อง (1–3 กล่องต่อออเดอร์)** (`boxes`)
2. **ระบบจำลองออเดอร์ (Mock Simulation 20–30 รายการ):** สุ่มสร้างออเดอร์ช่วง 10:00 น. โดยจับคู่กับลูกค้าจริงในฐานข้อมูล เพื่อให้สมาชิกคนที่ 3 สามารถกดจัดเส้นทางได้ทันที
3. **ระบบล้างออเดอร์ทั้งหมด:** ปุ่มล้างออเดอร์เพื่อเริ่มรอบการทดสอบใหม่ โดย **ต้องไม่ลบข้อมูลในตาราง `customers`**
4. **ตัวกรองออเดอร์รัศมี 2.0 กิโลเมตร:** กรองออเดอร์ที่อยู่ในรัศมีใกล้เคียงร้านค้า

### 1.2 หน้าตาหน้าจอที่ต้องพัฒนา (UI Layout & Components)
1. **แถบ Action Bar ด้านบนสุด:**
   - 🟣 ปุ่ม **"⚡ จำลอง 25 ออเดอร์ (10:00 น.)"** สำหรับสร้างข้อมูลทดสอบ
   - 🔴 ปุ่ม **"🗑️ ล้างออเดอร์ทั้งหมด"** สำหรับเริ่มรอบใหม่
2. **แถบ KPI Summary Cards 4 ใบ:**
   - 📦 **ออเดอร์ทั้งหมด:** จำนวนออเดอร์ในตาราง `orders`
   - 🍱 **จำนวนกล่องรวม:** ผลรวมของคอลัมน์ `boxes` ทั้งหมด
   - ⏳ **รอจัดส่ง (Pending):** ออเดอร์ที่ `status = 'pending'`
   - 💰 **ยอดขายรวม:** จำนวนกล่องรวม $\times 65$ บาท
3. **โซนฟอร์มสั่งซื้อ และแผงกรองระยะ 2.0 กม. (Grid ซ้าย-ขวา):**
   - **ฝั่งซ้าย (ฟอร์มสั่งซื้อ):** เลือกชื่อลูกค้าจาก Dropdown + เลือกจำนวนกล่อง `[ 1 กล่อง ]` `[ 2 กล่อง ]` `[ 3 กล่อง ]` + ระบุชื่อเมนู (`menu`)
   - **ฝั่งขวา (ตัวกรองรัศมี 2.0 กม.):** ช่องกรอกระยะทางรัศมี (ค่าเริ่มต้น 2.0 กม.) และปุ่ม "📍 กรองออเดอร์"
4. **โซนตารางรายการออเดอร์ (ด้านล่าง):**
   - แสดงรหัสออเดอร์ (`id`), ชื่อลูกค้า, เบอร์โทร, เมนูอาหาร (`menu`), จำนวนกล่อง (`boxes`), สถานะ (`status`)
   - ปุ่มแก้ไขจำนวนกล่องแบบ Inline และปุ่มลบออเดอร์

---

## 🛠️ 2. ขั้นตอนการทำงานตั้งแต่เริ่มต้นจนเสร็จสมบูรณ์ (Step-by-Step Execution)

### ขั้นตอนที่ 2.1: เตรียม Branch ใน Git
```bash
git switch develop
git pull origin develop
git switch -c feature/order-management
```

---

### ขั้นตอนที่ 2.2: สร้าง Data Model (`src/app/models/order.model.ts`)
```typescript
export type OrderStatus = 'pending' | 'assigned' | 'delivering' | 'delivered' | 'cancelled';

export interface Order {
  id: string;                  // รหัสออเดอร์ เช่น 'ORD-001'
  customer_id: string;         // รหัสลูกค้า เช่น 'CUST-001'
  boxes: number;               // จำนวนกล่อง (เงื่อนไขเหล็ก: 1 - 3 กล่อง)
  menu: string;                // ชื่อเมนูอาหาร เช่น 'ข้าวกะเพราหมูสับไข่เค็ม'
  status: OrderStatus;         // สถานะออเดอร์
  created_at?: string;         // วันเวลาที่สั่ง
  
  // ข้อมูลลูกค้าที่ JOIN มาจากตาราง customers
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  distance_km?: number;
}

export interface CreateOrderDto {
  customer_id: string;
  boxes: number;               // 1 - 3 กล่อง
  menu: string;
}
```

---

### ขั้นตอนที่ 2.3: สร้าง Service ด้วย Angular CLI (`OrderService`)
รันคำสั่ง:
```bash
ng g s services/order --skip-tests
```

แก้ไขโค้ดในไฟล์ `src/app/services/order.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, CreateOrderDto } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  // 1. ดึงออเดอร์ทั้งหมดพร้อมข้อมูลลูกค้าและระยะทาง
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  // 2. ดึงออเดอร์ราย ID
  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  // 3. แสดงออเดอร์ในระยะกำหนด (ค่าเริ่มต้น 2.0 กม.)
  getNearbyOrders(km: number = 2.0): Observable<Order[]> {
    const params = new HttpParams().set('km', km.toString());
    return this.http.get<Order[]>(`${this.apiUrl}/near`, { params });
  }

  // 4. ค้นหาออเดอร์ตามเงื่อนไข (status, id, customer_name ฯลฯ)
  searchOrders(criteria: { id?: string; customer_name?: string; menu?: string; status?: string }): Observable<Order[]> {
    let params = new HttpParams();
    Object.entries(criteria).forEach(([key, val]) => {
      if (val) params = params.set(key, val);
    });
    return this.http.get<Order[]>(`${this.apiUrl}/search`, { params });
  }

  // 5. เพิ่มออเดอร์ใหม่ (1-3 กล่อง)
  createOrder(dto: CreateOrderDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  // 6. จำลองออเดอร์ 20-30 รายการ
  simulateOrders(count: number = 25, clearExisting: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/simulate`, { count, clear_existing: clearExisting });
  }

  // 7. แก้ไขข้อมูลออเดอร์ทั้งหมดตาม ID
  updateOrder(id: string, dto: Partial<Order>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 8. แก้ไขจำนวนกล่องหรือสถานะเฉพาะฟิลด์
  patchOrder(id: string, dto: { boxes?: number; status?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 9. ลบออเดอร์เดี่ยว 1 รายการ
  deleteOrder(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // 10. ล้างออเดอร์ทั้งหมดในระบบ
  clearAllOrders(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/all`);
  }
}
```

---

## 🌐 3. ข้อกำหนดการเรียกใช้งาน API (`OrderService -> Backend`)

| Method | Endpoint | หน้าที่การทำงาน | Request Body |
|:---|:---|:---|:---|
| `GET` | `/orders` | ดึงรายการคำสั่งซื้อทั้งหมด | - |
| `GET` | `/orders/near?km=2.0` | กรองออเดอร์ในระยะกำหนด | - |
| `GET` | `/orders/search?status=pending` | ค้นหาออเดอร์ตามเงื่อนไข | - |
| `GET` | `/orders/:id` | ดึงข้อมูลคำสั่งซื้อเดี่ยว | - |
| `POST` | `/orders` | สร้างออเดอร์ใหม่ (1–3 กล่อง) | `{ customer_id, boxes: 2, menu }` |
| `POST` | `/orders/simulate` | จำลองสุ่มออเดอร์ 20–30 รายการ | `{ count: 25, clear_existing: true }` |
| `PUT` | `/orders/:id` | แก้ไขข้อมูลออเดอร์ทั้งหมด | `{ customer_id, boxes: 3, menu, status }` |
| `PATCH` | `/orders/:id` | แก้ไขจำนวนกล่องหรือสถานะ | `{ boxes: 3 }` |
| `DELETE` | `/orders/:id` | ลบออเดอร์เดี่ยว | - |
| `DELETE` | `/orders/all` | ล้างรายการออเดอร์ทั้งหมด | - |
