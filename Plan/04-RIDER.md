---
tags:
  - member-4
  - rider-portal
  - mobile-first
  - google-maps
  - api-calling
  - signals
title: คู่มือปฏิบัติงานฉบับละเอียด - สมาชิกคนที่ 4 (หน้าสำหรับไรเดอร์บนมือถือ)
---

# 🛵 คู่มือปฏิบัติงานฉบับละเอียด: สมาชิกคนที่ 4
> [!INFO] **ส่วนงานที่รับผิดชอบ:** หน้าสำหรับไรเดอร์บนมือถือ (Rider Mobile Portal & Navigation)  
> **เอกสารอ้างอิงหลัก:** [[PROJECT_PLAN|แผนแม่บท PaTim]] | **โครงสร้าง DB:** [[DATABASE_SCHEMA|ผัง ER Diagram]] | **API:** [[API_DOCUMENTATION|เอกสาร API]]

---

## 🏢 1. ภาพรวมหน้าที่และสิ่งที่โปรเจกต์ต้องเป็น (Project Overview & UI Concept)

### 1.1 หน้าที่ของสมาชิกคนที่ 4 ในทีม
คุณมีหน้าที่รับผิดชอบพัฒนา **Mobile Web Application สำหรับพนักงานส่งอาหาร (Rider)** 
ออกแบบมาเพื่อให้ไรเดอร์สามารถเปิดใช้งานบนโทรศัพท์มือถือได้อย่างสะดวกขณะขับขี่รถจักรยานยนต์ มีปุ่มกดขนาดใหญ่ อ่านง่าย มองเห็นชัดเจนกลางแดด และมีระบบนำทาง 1 คลิกเข้าสู่ **Google Maps Application** ทันที เพื่อส่งอาหารให้ถึงมือลูกค้าภายในกรอบเวลา **11:30 น. - 12:30 น. (ไม่เกิน 60 นาที)**

### 1.2 หน้าตาหน้าจอที่ต้องพัฒนา (Mobile-First UI Layout & Components)
หน้าจอจะถูกออกแบบให้เป็น **Mobile-First Layout** (ความกว้างหน้าจอด้านในจำกัดที่ `max-w-md mx-auto` พร้อมขอบมนและเงาแบบการ์ดสวยงาม):

```
┌──────────────────────────────────────────────┐
│  🛵 PaTim Rider Portal           🟢 Online   │
│  ⏱️ รอบส่งเที่ยง: 11:30 - 12:30 น. (ตรงเวลา)    │
├──────────────────────────────────────────────┤
│  🔍 ค้นหาใบงาน: [ JOB-MSU-01     ] [ ค้นหา ] │
├──────────────────────────────────────────────┤
│  📦 สรุปของที่ต้องรับขึ้นรถ (Pickup Summary) │
│  • ไรเดอร์: คุณสมชาย ใจดี                    │
│  • จำนวนข้าวกล่องทั้งหมด: 8 กล่อง (ห้ามเกิน 10) │
│  • จำนวนจุดส่ง: 3 จุด (ห้ามเกิน 3 จุด)       │
│  • ความคืบหน้า: [████████░░░░] 2/3 จุด (67%) │
├──────────────────────────────────────────────┤
│  📍 ลำดับการส่ง (Delivery Sequence):         │
│                                              │
│  [1] คุณกิตติศักดิ์ พลสว่าง (3 กล่อง) - 🟢 ส่งแล้ว │
│      หอพักกัญญาพัชร ห้อง 302                 │
│      📞 081-234-5678                         │
│                                              │
│  [2] คุณนพรัตน์ แสนสุข (2 กล่อง) - 🟡 กำลังไปส่ง │
│      สำนักวิทยบริการ (ห้องสมุด มมส)          │
│      📞 083-678-9014                         │
│      [ 🗺️ เปิด Google Maps นำทาง ]            │
│      [ ✅ บันทึกว่าส่งสำเร็จแล้ว ]             │
│                                              │
│  [3] คุณสมชาย สุขใจ (3 กล่อง) - ⏳ รอดำเนินการ   │
│      หอพักศิริพร ห้อง 101                    │
│      📞 089-111-2233                         │
│      [ 🗺️ เปิด Google Maps นำทาง ]            │
│      [ ✅ บันทึกว่าส่งสำเร็จแล้ว ]             │
└──────────────────────────────────────────────┘
```

---

## 🛠️ 2. ขั้นตอนการทำงานตั้งแต่เริ่มต้นจนเสร็จสมบูรณ์ (Step-by-Step Execution)

### ขั้นตอนที่ 2.1: เตรียม Branch ใน Git
```bash
git switch develop
git pull origin develop
git switch -c feature/rider-portal
```

---

### ขั้นตอนที่ 2.2: สร้าง Data Model (`src/app/models/rider-job.model.ts`)
```typescript
export type StopDeliveryStatus = 'pending' | 'in_progress' | 'delivered' | 'failed';

export interface RiderStopItem {
  id: string;                // 'STOP-001'
  route_id?: string;         // 'ROUTE-01'
  order_id: string;          // 'ORD-001'
  stop_number: number;       // 1, 2, 3
  distance_before: number;   // ระยะทางจากจุดก่อนหน้า
  total_time: number;        // เวลารวมตั้งแต่เริ่มถึงจุดนี้
  status: StopDeliveryStatus;// 'pending' | 'in_progress' | 'delivered' | 'failed'
  delivered_at?: string;     // เวลาส่งสำเร็จ

  // ข้อมูลลูกค้าจากตาราง orders -> customers
  customer_name: string;     // ชื่อลูกค้าผู้รับ
  phone: string;             // เบอร์โทรศัพท์
  address: string;           // ที่อยู่จัดส่ง
  latitude: number;          // ละติจูด
  longitude: number;         // ลองจิจูด
  boxes: number;             // จำนวนกล่อง (1 - 3 กล่อง)
}

export interface RiderJobBatch {
  id: string;                // 'ROUTE-01'
  rider_id: string;          // 'RD-01'
  rider_name: string;        // ชื่อไรเดอร์
  rider_phone: string;       // เบอร์โทรไรเดอร์
  job_code: string;          // เช่น 'JOB-MSU-01'
  total_orders: number;      // จำนวนจุดส่ง (<= 3 จุด)
  total_boxes: number;       // จำนวนกล่องรวม (<= 10 กล่อง)
  total_distance: number;    // ระยะทางรวม (กม.)
  time_delivery: number;     // เวลารวม (นาที)
  delivery_price: number;    // ค่าขนส่ง
  net_profit: number;        // กำไรสุทธิ
  status: 'assigned' | 'in_progress' | 'completed';
  stops: RiderStopItem[];    // รายการจุดส่งเรียงตามลำดับ 1 -> 2 -> 3
}
```

---

### ขั้นตอนที่ 2.3: สร้าง Service ด้วย Angular CLI (`RiderService`)
รันคำสั่ง:
```bash
ng g s services/rider --skip-tests
```

แก้ไขโค้ดในไฟล์ `src/app/services/rider.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RiderJobBatch, StopDeliveryStatus } from '../models/rider-job.model';

@Injectable({
  providedIn: 'root'
})
export class RiderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/delivery-routes`;

  /**
   * ดึงข้อมูลใบงานตาม Job Code (เช่น JOB-MSU-01)
   */
  getJobByCode(jobCode: string): Observable<RiderJobBatch> {
    return this.http.get<RiderJobBatch>(`${this.apiUrl}/${jobCode}`).pipe(
      catchError(err => {
        console.warn(`[RiderService] API Offline -> Using Mock Data for job ${jobCode}`, err);
        return of(this.getFallbackMockJob(jobCode));
      })
    );
  }

  /**
   * อัปเดตสถานะจุดจัดส่ง (เช่น เปลี่ยนเป็น 'delivered')
   */
  updateStopStatus(jobCode: string, stopId: string, status: StopDeliveryStatus): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${jobCode}/stops/${stopId}`, {
      status
    }).pipe(
      catchError(err => {
        console.warn('[RiderService] API Offline -> Simulated status update success', err);
        return of({ success: true, stop_id: stopId, status, delivered_at: new Date().toISOString() });
      })
    );
  }

  /**
   * สร้างลิงก์นำทาง Google Maps Navigation URL ด้วยพิกัดปลายทาง
   */
  buildGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }

  /**
   * ข้อมูลจำลอง (Mock Data) สำหรับทดสอบ
   */
  private getFallbackMockJob(jobCode: string): RiderJobBatch {
    return {
      id: 'ROUTE-01',
      rider_id: 'RD-01',
      job_code: jobCode || 'JOB-MSU-01',
      rider_name: 'คุณสมชาย ใจดี (Rider 1)',
      rider_phone: '089-999-8888',
      total_boxes: 8,
      total_orders: 3,
      total_distance: 3.8,
      time_delivery: 28,
      delivery_price: 45.40,
      net_profit: 154.60,
      status: 'in_progress',
      stops: [
        {
          id: 'STOP-001',
          order_id: 'ORD-001',
          stop_number: 1,
          distance_before: 0.25,
          total_time: 5.0,
          customer_name: 'คุณกิตติศักดิ์ พลสว่าง',
          phone: '081-234-5678',
          address: 'หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง',
          latitude: 16.248231,
          longitude: 103.250125,
          boxes: 3,
          status: 'delivered',
          delivered_at: '2026-10-04T04:42:00.000Z'
        },
        {
          id: 'STOP-002',
          order_id: 'ORD-018',
          stop_number: 2,
          distance_before: 1.20,
          total_time: 15.0,
          customer_name: 'คุณนพรัตน์ แสนสุข',
          phone: '083-678-9014',
          address: 'สำนักวิทยบริการ (ห้องสมุด มมส)',
          latitude: 16.2452,
          longitude: 103.2518,
          boxes: 2,
          status: 'in_progress'
        },
        {
          id: 'STOP-003',
          order_id: 'ORD-027',
          stop_number: 3,
          distance_before: 2.35,
          total_time: 28.0,
          customer_name: 'คุณสมชาย สุขใจ',
          phone: '089-111-2233',
          address: 'หอพักศิริพร ห้อง 101 ท่าขอนยาง',
          latitude: 16.2475,
          longitude: 103.251,
          boxes: 3,
          status: 'pending'
        }
      ]
    };
  }
}
```

---

## 🌐 3. ข้อกำหนด API Endpoints (Backend Contracts)

> [!TIP] **Base URL:** `http://localhost:3000/api/delivery-routes`

| Method | Endpoint | คำอธิบายการทำงาน | Request / Response |
|:---|:---|:---|:---|
| `GET` | `/delivery-routes/:jobCode` | ดึงข้อมูลใบงานพร้อมรายการจุดส่ง 1, 2, 3 | **Response 200:** ข้อมูล `RiderJobBatch` |
| `PATCH` | `/delivery-routes/:jobCode/stops/:stopId` | อัปเดตสถานะจุดส่งเป็น `delivered` | **Body:** `{ status: "delivered" }` |
