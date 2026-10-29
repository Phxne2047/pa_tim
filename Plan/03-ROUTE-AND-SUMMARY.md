---
tags:
  - member-3
  - route-optimization
  - vrp-algorithm
  - financial-dashboard
  - leaflet
  - openstreetmap
title: คู่มือปฏิบัติงานฉบับละเอียด - สมาชิกคนที่ 3 (การจัดเส้นทางและแดชบอร์ดสรุปยอด)
---

# 🗺️ คู่มือปฏิบัติงานฉบับละเอียด: สมาชิกคนที่ 3
> [!INFO] **ส่วนงานที่รับผิดชอบ:** ระบบจัดเส้นทางและแบ่งงานไรเดอร์อัจฉริยะ (VRP) & แดชบอร์ดการเงิน Real-time  
> **เอกสารอ้างอิงหลัก:** [[PROJECT_PLAN|แผนแม่บท PaTim]] | **โครงสร้าง DB:** [[DATABASE_SCHEMA|ผัง ER Diagram]] | **API:** [[API_DOCUMENTATION|เอกสาร API]]

---

## 🏢 1. ภาพรวมหน้าที่และสิ่งที่โปรเจกต์ต้องเป็น (Project Overview & UI Concept)

### 1.1 หน้าที่ของสมาชิกคนที่ 3 ในทีม
คุณมีหน้าที่รับผิดชอบ **หัวใจสำคัญที่สุดของโปรเจกต์** คือการสร้างระบบคิดแทนเจ้าของร้าน โดยนำรายการออเดอร์ทั้งหมดที่สมาชิกคนที่ 2 เตรียมไว้ มาทำการ **จัดกลุ่มแบ่งงานให้ไรเดอร์แต่ละคน (Dispatching) และคำนวณเส้นทางวิ่งที่สั้นที่สุด (Route Optimization)** ภายใต้เงื่อนไขเหล็ก:
1. มอเตอร์ไซค์ 1 คัน ขนข้าวกล่องได้ **ไม่เกิน 10 กล่อง** (`total_boxes <= 10`)
2. ไรเดอร์ 1 คน รับงานได้ **ไม่เกิน 3 ออเดอร์ (3 จุดส่ง)** ต่อรอบ (`total_orders <= 3`)
3. เวลาออกเดินทางคือ **11:30 น.** และต้องส่งถึงจุดสุดท้าย **ไม่เกิน 12:30 น. (ภายในเวลา 60 นาที)** (`time_delivery <= 60`) โดยคำนวณจากความเร็วเฉลี่ย 30 กม./ชม. (1 กม. $\approx$ 2 นาที)
4. **แสดงเส้นทางวิ่งแยกตามสีบนแผนที่ Leaflet ขนาดใหญ่** เพื่อให้เจ้าของร้านตรวจเช็กภาพรวมได้ง่าย (อ้างอิงฟิลด์ `color` ในตาราง `riders`)
5. **คำนวณและสรุปตัวเลขทางการเงินแบบ Real-time:**
   - $\text{delivery\_price} = 15 + (\text{total\_distance} \times 2 \times \text{total\_boxes})$
   - $\text{net\_profit} = (\text{total\_boxes} \times 25) - \text{delivery\_price}$

### 1.2 หน้าตาหน้าจอที่ต้องพัฒนา (UI Layout & Components)
1. **แถบ Action Header ด้านบน:**
   - ⚡ ปุ่ม **"คำนวณจัดเส้นทางอัตโนมัติ"** (กดครั้งเดียวเวลา 11:30 น. ระบบแบ่งงานทันที)
   - 🔄 ปุ่ม **"คำนวณใหม่ (ทางเลือกอื่น)"** (สร้างทางเลือกเส้นทางแบบอื่นให้เจ้าของร้านเปรียบเทียบ)
   - 💾 ปุ่ม **"บันทึกและส่งใบงานให้ไรเดอร์"** (`POST /delivery-routes`)
2. **แผง Real-time Financial Dashboard (KPI Cards 4 ใบ):**
   - 💰 **รายรับรวม:** $\text{จำนวนกล่องรวม} \times 65$ บาท
   - 🥩 **ต้นทุนอาหารรวม:** $\text{จำนวนกล่องรวม} \times 40$ บาท (กำไรขั้นต้น $= \text{กล่อง} \times 25$)
   - 🛵 **ค่าขนส่งรวม (delivery_price):** ผลรวมค่าจ้างไรเดอร์ทั้งหมด
   - 🟢 **กล่องใหญ่เน้นพิเศษ "กำไรสุทธิ (net_profit)":** กำไรขั้นต้นหักค่าขนส่ง พร้อมบอกจำนวนไรเดอร์ที่ต้องใช้
3. **โซนแผนที่ขนาดใหญ่ (Leaflet Multi-Rider Map):**
   - แผนที่ขนาดใหญ่แสดงเส้นทาง Polyline ของไรเดอร์แต่ละคนด้วย **สีประจำตัว** (`riders.color`)
   - หมุดร้านค้าสีแดง 🏠 ตรงกลาง (ม.มหาสารคาม: `Lat 16.246839, Lng 103.251963`)
   - หมุดจุดส่งของลูกค้ามีตัวเลขบอกลำดับการวิ่งส่ง **1, 2, 3** (`stop_number`) และมีสีตรงกับเส้นทางของไรเดอร์คนนั้น
4. **โซนตารางสรุปการแบ่งงานไรเดอร์ (Rider Job Batches):**
   - การ์ดสรุปงานของไรเดอร์แต่ละคน (เช่น ไรเดอร์คนที่ 1: Job Code `JOB-MSU-01`, ขน 8 กล่อง, ระยะทาง 3.8 กม., เวลา 28 นาที, ค่าส่ง ฿45.40, กำไร ฿154.60)
   - แสดงลำดับการวิ่งส่งแบบ Step-by-Step: `🏠 ร้านค้า -> 📍 จุด 1 (คุณ A) -> 📍 จุด 2 (คุณ B) -> 📍 จุด 3 (คุณ C)`

---

## 🛠️ 2. ขั้นตอนการทำงานตั้งแต่เริ่มต้นจนเสร็จสมบูรณ์ (Step-by-Step Execution)

### ขั้นตอนที่ 2.1: เตรียม Branch ใน Git
```bash
git switch develop
git pull origin develop
git switch -c feature/route-optimization
```

---

### ขั้นตอนที่ 2.2: สร้าง Data Model (`src/app/models/route.model.ts`)
```typescript
import { Order } from './order.model';

export interface Rider {
  id: string;              // เช่น 'RD-01'
  name: string;            // เช่น 'คุณสมชาย ใจดี'
  phone: string;
  color: string;           // เช่น '#EF4444'
}

export interface RouteStop {
  id: string;              // เช่น 'STOP-001'
  route_id?: string;       // เช่น 'ROUTE-01'
  order_id: string;        // เช่น 'ORD-001'
  stop_number: number;     // 1, 2, 3
  distance_before: number; // ระยะทางจากจุดก่อนหน้า (กม.)
  total_time: number;      // เวลารวมตั้งแต่เริ่มถึงจุดนี้ (นาที)
  status: string;          // 'pending' | 'in_progress' | 'delivered' | 'failed'
  delivered_at?: string;
  
  // ข้อมูลเสริมสำหรับแสดงผล UI
  customer_name?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  boxes?: number;
}

export interface DeliveryRoute {
  id: string;              // เช่น 'ROUTE-01'
  rider_id: string;        // เช่น 'RD-01'
  job_code: string;        // เช่น 'JOB-MSU-01'
  total_orders: number;    // ต้อง <= 3
  total_boxes: number;     // ต้อง <= 10
  total_distance: number;  // ระยะทางรวม (กม.)
  time_delivery: number;   // เวลารวม (นาที) ต้อง <= 60
  delivery_price: number;  // 15 + (total_distance * 2 * total_boxes)
  net_profit: number;      // (total_boxes * 25) - delivery_price
  status: string;          // 'assigned' | 'in_progress' | 'completed'
  
  // ข้อมูลเสริมสำหรับแสดงผล
  rider_name?: string;
  rider_phone?: string;
  rider_color?: string;
  stops?: RouteStop[];
  orders?: Order[];
  is_valid?: boolean;
  warning_message?: string;
}

export interface DispatchSummary {
  dispatch_time: string;   // '11:30 น.'
  deadline_time: string;   // '12:30 น.'
  total_riders: number;
  total_orders: number;
  total_boxes: number;
  total_distance: number;
  total_delivery_price: number;
  total_revenue: number;
  total_food_cost: number;
  total_gross_profit: number;
  total_net_profit: number;
  routes: DeliveryRoute[];
}
```

---

### ขั้นตอนที่ 2.3: สร้าง Service ด้วย Angular CLI (`RouteCalculatorService`)
รันคำสั่ง:
```bash
ng g s services/route-calculator --skip-tests
ng g s services/delivery-route --skip-tests
```

แก้ไขโค้ดในไฟล์ `src/app/services/route-calculator.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { Order } from '../models/order.model';
import { DeliveryRoute, RouteStop, DispatchSummary } from '../models/route.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RouteCalculatorService {
  private riderColors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(3));
  }

  optimizeRoutes(orders: Order[], randomizeSeed: boolean = false): DispatchSummary {
    const shop = environment.shopLocation;
    const pendingOrders = [...orders.filter(o => o.status !== 'delivered')];

    if (randomizeSeed) {
      pendingOrders.sort(() => Math.random() - 0.5);
    } else {
      pendingOrders.sort((a, b) => {
        const latA = a.customer_latitude ?? shop.latitude;
        const lngA = a.customer_longitude ?? shop.longitude;
        const latB = b.customer_latitude ?? shop.latitude;
        const lngB = b.customer_longitude ?? shop.longitude;
        const distA = this.calculateDistanceKm(shop.latitude, shop.longitude, latA, lngA);
        const distB = this.calculateDistanceKm(shop.latitude, shop.longitude, latB, lngB);
        return distA - distB;
      });
    }

    const routes: DeliveryRoute[] = [];
    let riderIndex = 1;

    while (pendingOrders.length > 0) {
      const currentOrders: Order[] = [];
      let currentBoxes = 0;

      // กฎข้อบังคับ: ไม่เกิน 10 กล่อง และ ไม่เกิน 3 ออเดอร์
      for (let i = 0; i < pendingOrders.length; i++) {
        const order = pendingOrders[i];
        if (currentOrders.length < 3 && currentBoxes + order.boxes <= 10) {
          currentOrders.push(order);
          currentBoxes += order.boxes;
          pendingOrders.splice(i, 1);
          i--;
        }
      }

      // เรียงลำดับจุดส่งด้วย Nearest Neighbor
      const stops: RouteStop[] = [];
      let currentLat = shop.latitude;
      let currentLng = shop.longitude;
      let totalDist = 0;
      let accumulatedTime = 0;
      const unvisited = [...currentOrders];
      let seq = 1;

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;

        for (let j = 0; j < unvisited.length; j++) {
          const lat = unvisited[j].customer_latitude ?? shop.latitude;
          const lng = unvisited[j].customer_longitude ?? shop.longitude;
          const d = this.calculateDistanceKm(currentLat, currentLng, lat, lng);
          if (d < minDist) {
            minDist = d;
            nearestIdx = j;
          }
        }

        const nextOrder = unvisited.splice(nearestIdx, 1)[0];
        totalDist += minDist;
        const legMinutes = parseFloat(((minDist / 30) * 60).toFixed(1)); // 30 km/h
        accumulatedTime += legMinutes;

        const lat = nextOrder.customer_latitude ?? shop.latitude;
        const lng = nextOrder.customer_longitude ?? shop.longitude;

        stops.push({
          id: `STOP-${String(riderIndex).padStart(2, '0')}-${seq}`,
          route_id: `ROUTE-${String(riderIndex).padStart(2, '0')}`,
          order_id: nextOrder.id,
          stop_number: seq,
          distance_before: parseFloat(minDist.toFixed(2)),
          total_time: parseFloat(accumulatedTime.toFixed(1)),
          status: 'pending',
          customer_name: nextOrder.customer_name || 'ลูกค้า',
          phone: nextOrder.customer_phone || '-',
          address: nextOrder.customer_address || '-',
          latitude: lat,
          longitude: lng,
          boxes: nextOrder.boxes
        });

        seq++;
        currentLat = lat;
        currentLng = lng;
      }

      const totalEstimatedMinutes = parseFloat(((totalDist / 30) * 60).toFixed(1));
      const deliveryPrice = parseFloat((15 + totalDist * 2 * currentBoxes).toFixed(2));
      const netProfit = parseFloat((currentBoxes * 25 - deliveryPrice).toFixed(2));
      const isValid = totalEstimatedMinutes <= 60 && currentBoxes <= 10 && stops.length <= 3;

      routes.push({
        id: `ROUTE-${String(riderIndex).padStart(2, '0')}`,
        rider_id: `RD-${String(riderIndex).padStart(2, '0')}`,
        job_code: `JOB-MSU-${String(riderIndex).padStart(2, '0')}`,
        total_orders: stops.length,
        total_boxes: currentBoxes,
        total_distance: parseFloat(totalDist.toFixed(2)),
        time_delivery: totalEstimatedMinutes,
        delivery_price: deliveryPrice,
        net_profit: netProfit,
        status: 'assigned',
        rider_name: `คุณไรเดอร์คนที่ ${riderIndex}`,
        rider_phone: `089-000-000${riderIndex}`,
        rider_color: this.riderColors[(riderIndex - 1) % this.riderColors.length],
        stops,
        orders: currentOrders,
        is_valid: isValid,
        warning_message: totalEstimatedMinutes > 60 ? '⚠️ เวลาจัดส่งเกิน 60 นาที' : undefined
      });

      riderIndex++;
    }

    return {
      dispatch_time: '11:30 น.',
      deadline_time: '12:30 น.',
      total_riders: routes.length,
      total_orders: routes.reduce((sum, r) => sum + r.total_orders, 0),
      total_boxes: routes.reduce((sum, r) => sum + r.total_boxes, 0),
      total_distance: parseFloat(routes.reduce((sum, r) => sum + r.total_distance, 0).toFixed(2)),
      total_delivery_price: parseFloat(routes.reduce((sum, r) => sum + r.delivery_price, 0).toFixed(2)),
      total_revenue: routes.reduce((sum, r) => sum + r.total_boxes * 65, 0),
      total_food_cost: routes.reduce((sum, r) => sum + r.total_boxes * 40, 0),
      total_gross_profit: routes.reduce((sum, r) => sum + r.total_boxes * 25, 0),
      total_net_profit: parseFloat(routes.reduce((sum, r) => sum + r.net_profit, 0).toFixed(2)),
      routes
    };
  }
}
```

---

## 🌐 3. ข้อกำหนดการเรียกใช้งาน API (`DeliveryRouteService -> Backend`)

| Method | Endpoint | หน้าที่การทำงาน | Request Body |
|:---|:---|:---|:---|
| `GET` | `/orders` | ดึงรายการออเดอร์ทั้งหมดเพื่อนำมากรอง `status=pending` คำนวณเส้นทาง | - |
| `GET` | `/riders` | ดึงรายชื่อไรเดอร์และรหัสสี | - |
| `POST` | `/delivery-routes` | บันทึกผลการจัดเส้นทางและสร้างใบงานไรเดอร์ | `{ routes: [...] }` |
| `GET` | `/delivery-routes` | ดึงข้อมูลสายส่งทั้งหมดและสรุปยอด | - |
