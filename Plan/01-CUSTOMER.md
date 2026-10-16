---
tags:
  - member-1
  - customer-management
  - leaflet
  - openstreetmap
  - api-calling
  - crud
title: คู่มือปฏิบัติงานฉบับละเอียด - สมาชิกคนที่ 1 (ระบบจัดการข้อมูลลูกค้า)
---

# 👤 คู่มือปฏิบัติงานฉบับละเอียด: สมาชิกคนที่ 1
> [!INFO] **ส่วนงานที่รับผิดชอบ:** ระบบจัดการข้อมูลลูกค้า (Customer Management Portal & Map)  
> **เอกสารอ้างอิงหลัก:** [[PROJECT_PLAN|แผนแม่บท PaTim]] | **คู่มือแผนที่:** [[05-LEAFLET-GUIDE|คู่มือ Leaflet Map]] | **API:** [[API_DOCUMENTATION|เอกสาร API]]

---

## 🏢 1. ภาพรวมหน้าที่และสิ่งที่โปรเจกต์ต้องเป็น (Project Overview & UI Concept)

### 1.1 หน้าที่ของสมาชิกคนที่ 1 ในทีม
คุณมีหน้าที่รับผิดชอบพัฒนาระบบจัดการข้อมูลลูกค้าสำหรับ **เจ้าของร้าน** เพื่อให้เจ้าของร้านสามารถบันทึกพิกัดบ้านลูกค้า ค้นหาลูกค้าเก่าด้วยเบอร์โทรหรือชื่อ และดูตำแหน่งลูกค้าบนแผนที่ได้อย่างแม่นยำ ซึ่งข้อมูลลูกค้าที่คุณจัดการจะเป็น **ข้อมูลตั้งต้นสำคัญ (Master Data)** ที่สมาชิกคนที่ 2 (ออเดอร์) และคนที่ 3 (จัดเส้นทาง) ต้องนำไปใช้งานต่อ

### 1.2 หน้าตาหน้าจอที่ต้องพัฒนา (UI Layout & Components)
หน้าจอจะถูกแบ่งออกเป็น 4 โซนหลักอย่างชัดเจน:
1. **โซนค้นหาและตัวกรองด้านบน (Search & Filter Bar):**
   - ช่องกรอกค้นหาชื่อลูกค้า หรือรหัสลูกค้า (กด Enter หรือคลิกปุ่มค้นหา)
   - ช่องระบุรัศมีค้นหา (ค่าเริ่มต้น 1.0 กม.) พร้อมปุ่มกด "กรองในรัศมี 1.0 กม." และปุ่มรีเซ็ต
2. **โซนแผนที่ Leaflet (ฝั่งซ้าย - 2 ใน 3 ของจอ):**
   - แสดงแผนที่ OpenStreetMap ปักหมุดร้านค้าตรงกลาง (ม.มหาสารคาม: `Lat 16.246839, Lng 103.251963`)
   - ปักหมุดบ้านของลูกค้าทุกคน (คลิกหมุดแล้วมี Popup บอกชื่อ, เบอร์โทร, ที่อยู่)
   - **ฟังก์ชันคลิกบนแผนที่ (Coordinate Picker):** คลิกที่ตำแหน่งใดก็ได้บนแผนที่ พิกัด Lat และ Lng จะถูกดึงไปกรอกในฟอร์มทันที
   - เมื่อกดค้นหาระยะใกล้ จะวาดวงกลมสีฟ้า `L.circle` รัศมี 1.0 กม. บนแผนที่
3. **โซนฟอร์มเพิ่ม/แก้ไขลูกค้า (ฝั่งขวา - 1 ใน 3 ของจอ):**
   - ฟอร์มรับข้อมูล: ชื่อ-นามสกุล (`name`), เบอร์โทรศัพท์ (`phone`), ที่อยู่/จุดสังเกต (`address`), ละติจูด (`latitude`), ลองจิจูด (`longitude`)
   - ปุ่ม "บันทึกข้อมูล" (สลับโหมดระหว่างเพิ่มใหม่ และแก้ไขข้อมูลเดิม)
4. **โซนตารางรายชื่อลูกค้า (ด้านล่าง):**
   - ตารางแสดงรหัสลูกค้า (เช่น `CUST-001`), ชื่อ-นามสกุล, เบอร์โทร, ที่อยู่, พิกัด Lat/Lng
   - ปุ่มกด "✏️ แก้ไข" (ดึงข้อมูลกลับขึ้นไปในฟอร์ม) และปุ่ม "🗑️ ลบ" (พร้อมหน้าต่างยืนยัน)

---

## 🛠️ 2. ขั้นตอนการทำงานตั้งแต่เริ่มต้นจนเสร็จสมบูรณ์ (Step-by-Step Execution)

### ขั้นตอนที่ 2.1: เตรียม Branch ใน Git
```bash
# สลับไปที่ develop และดึงโค้ดล่าสุด
git switch develop
git pull origin develop

# สร้าง branch ทำงานของตนเอง
git switch -c feature/customer-management
```

---

### ขั้นตอนที่ 2.2: สร้าง Data Model (`src/app/models/customer.model.ts`)
```typescript
export interface Customer {
  id: string;              // รหัสลูกค้า เช่น 'CUST-001'
  name: string;            // ชื่อ-นามสกุลลูกค้า
  phone: string;           // เบอร์โทรศัพท์
  address: string;         // ที่อยู่ / หอพัก / คณะ
  latitude: number;        // ละติจูด
  longitude: number;       // ลองจิจูด
  created_at?: string;     // วันที่สร้าง
  distance_km?: number;    // ระยะทางห่างจากร้านค้า (กม.) เมื่อยิง /customers/near
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}
```

---

### ขั้นตอนที่ 2.3: สร้าง Service ด้วย Angular CLI (`CustomerService`)
รันคำสั่ง:
```bash
ng g s services/customer --skip-tests
```

แก้ไขโค้ดในไฟล์ `src/app/services/customer.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer, CreateCustomerDto } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/customers`;

  // 1. ดึงลูกค้าทั้งหมด
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  // 2. ดึงลูกค้ารายคนตาม ID
  getCustomerById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  // 3. เพิ่มลูกค้าใหม่
  createCustomer(dto: CreateCustomerDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, dto);
  }

  // 4. แก้ไขข้อมูลลูกค้าทั้งหมดตาม ID
  updateCustomer(id: string, dto: CreateCustomerDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 5. แก้ไขข้อมูลลูกค้าเฉพาะบางฟิลด์ตาม ID
  patchCustomer(id: string, dto: Partial<CreateCustomerDto>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, dto);
  }

  // 6. ลบข้อมูลลูกค้า
  deleteCustomer(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // 7. ค้นหาตามชื่อหรือรหัส ID
  searchCustomers(keyword: string): Observable<Customer[]> {
    const params = new HttpParams().set('name', keyword);
    return this.http.get<Customer[]>(`${this.apiUrl}/search`, { params });
  }

  // 8. ค้นหาในรัศมีร้านค้า (ค่าเริ่มต้น 1.0 กม.)
  getNearbyCustomers(km: number = 1.0): Observable<Customer[]> {
    const params = new HttpParams().set('km', km.toString());
    return this.http.get<Customer[]>(`${this.apiUrl}/near`, { params });
  }
}
```

---

### ขั้นตอนที่ 2.4: สร้าง Page Component (`customer-management`)
รันคำสั่ง:
```bash
ng g c pages/customer-management --skip-tests
```

#### การเขียน Logic ใน `customer-management.ts`:
1. **ประกาศตัวแปร Signal:**
   - `customers = signal<Customer[]>([]);`
   - `isLoading = signal<boolean>(false);`
   - `searchTerm = signal<string>('');`
   - `formData = signal<CreateCustomerDto>({ name: '', phone: '', address: '', latitude: 16.246839, longitude: 103.251963 });`
   - `isEditing = signal<boolean>(false);`
   - `selectedCustomerId = signal<string | null>(null);`
2. **สร้างแผนที่ใน `ngAfterViewInit()`:**
   - สั่ง `L.map('customer-map').setView([16.246839, 103.251963], 14)`
   - โหลด Tile OpenStreetMap
   - สร้างหมุดร้านค้าด้วย `L.divIcon` สีแดง
   - สั่ง `map.on('click', (e) => { this.formData.update(f => ({ ...f, latitude: parseFloat(e.latlng.lat.toFixed(6)), longitude: parseFloat(e.latlng.lng.toFixed(6)) })); })`
3. **วาดหมุดลูกค้า:**
   - นำรายชื่อลูกค้าจาก `customers()` มาวนลูปสร้าง `L.marker([c.latitude, c.longitude]).bindPopup(...)` ใส่ลงใน `markersLayer`
4. **ฟังก์ชันค้นหาและกรองระยะ:**
   - `onSearch()`: เรียก `customerService.searchCustomers(this.searchTerm())`
   - `onFilterNearby()`: เรียก `customerService.getNearbyCustomers(1.0)` พร้อมวาด `L.circle([16.246839, 103.251963], { radius: 1000 })` บนแผนที่
5. **ฟังก์ชันฟอร์ม:**
   - `onSubmitForm()`: ตรวจสอบ Validation แล้วเรียก `createCustomer()` หรือ `updateCustomer()`
   - `onEdit(c: Customer)`: ดึงข้อมูลเข้า `formData` และตั้ง `isEditing = true`
   - `onDelete(id: string)`: ยืนยันการลบแล้วเรียก `deleteCustomer(id)`
6. **คืนหน่วยความจำ:**
   - ใส่ `this.map?.remove()` ใน `ngOnDestroy()` เสมอ

---

## ⚠️ 3. สิ่งสำคัญและข้อกำหนดทางธุรกิจที่ห้ามพลาด (Must-Know & Constraints)

> [!WARNING] **เงื่อนไขสำคัญที่ต้องตรวจสอบ**
> 1. **ความถูกต้องของพิกัด:** พิกัดร้านค้าป้าติ๋มอยู่ที่ `Lat 16.246839, Lng 103.251963` (ม.มหาสารคาม)
> 2. **การค้นหาระยะทาง 1.0 กม.:** เรียกผ่าน `GET /customers/near?km=1.0` ซึ่งคำนวณจากสูตร Haversine บน Backend
> 3. **Foreign Key Constraint:** ลูกค้าที่ถูกผูกกับออเดอร์ในระบบแล้ว หากจะลบต้องระวังการเกิด Foreign Key Error

---

## 🌐 4. ข้อกำหนดการเรียกใช้งาน API (`CustomerService -> Backend`)

> [!NOTE] **รูปแบบการเชื่อมต่อ:** ติดต่อสื่อสารกับ Backend ผ่าน RESTful API (`HttpClient`)

### สรุป Endpoint สำหรับระบบลูกค้า:
| Method | Endpoint | หน้าที่การทำงาน | Request Body | Response ตัวอย่าง |
|:---|:---|:---|:---|:---|
| `GET` | `/customers` | ดึงรายชื่อลูกค้าทั้งหมด | - | `[{ id: "CUST-001", name: "...", phone: "...", address: "...", latitude: 16.248, longitude: 103.250 }, ...]` |
| `GET` | `/customers/near?km=1.0` | ค้นหาลูกค้าในรัศมีร้านค้า (Default 1.0 กม.) | - | `[{ id: "CUST-023", name: "...", distance_km: 0.18, ... }]` |
| `GET` | `/customers/search?name=...` | ค้นหาลูกค้าตามชื่อหรือ ID | - | `[{ id: "CUST-001", name: "...", ... }]` |
| `GET` | `/customers/:id` | ดึงข้อมูลลูกค้าตาม ID | - | `{ id: "CUST-001", name: "...", ... }` |
| `POST` | `/customers` | เพิ่มข้อมูลลูกค้าใหม่ | `{ name, phone, address, latitude, longitude }` | `{ affected_row: 1, last_id: "CUST-027", customer: { ... } }` |
| `PUT` | `/customers/:id` | แก้ไขข้อมูลลูกค้าทั้งหมดตาม ID | `{ name, phone, address, latitude, longitude }` | `{ affected_row: 1, message: "Customer updated successfully" }` |
| `PATCH` | `/customers/:id` | แก้ไขข้อมูลลูกค้าเฉพาะบางฟิลด์ | `{ phone: "..." }` | `{ affected_row: 1, message: "Customer patched successfully" }` |
| `DELETE` | `/customers/:id` | ลบข้อมูลลูกค้าตาม ID | - | `{ affected_row: 1, message: "Customer deleted successfully" }` |

---

## 🧪 5. รายการทดสอบและเกณฑ์การตรวจรับงาน (Testing & Checklist)

| ลำดับ | สิ่งที่ต้องทดสอบ | ผลลัพธ์ที่คาดหวัง |
|:---|:---|:---|
| 1 | การเปิดหน้าเว็บ | แผนที่ Leaflet โหลดขึ้นมาตรงจุด ม.มหาสารคาม หมุดร้านค้าสีแดงแสดงชัดเจน |
| 2 | การคลิกเลือกพิกัด | คลิกบนแผนที่แล้ว ช่องละติจูดและลองจิจูดในฟอร์มเปลี่ยนค่าตามจุดที่คลิกทันที |
| 3 | เพิ่มลูกค้าใหม่ | กรอกข้อมูลครบถ้วน กดบันทึกแล้ว มีหมุดใหม่ปรากฏบนแผนที่ และมีแถวใหม่ในตาราง |
| 4 | แก้ไขข้อมูล | กดปุ่มแก้ไข ข้อมูลเดิมถูกดึงเข้าฟอร์ม แก้ไขแล้วกดบันทึก ข้อมูลอัปเดตถูกต้อง |
| 5 | ลบข้อมูล | กดปุ่มลบ มีหน้าต่างยืนยัน และข้อมูลถูกลบออกจากตารางและแผนที่ |
| 6 | ค้นหาชื่อ/ID | พิมพ์ชื่อ เช่น "สมชาย" แล้วแสดงเฉพาะลูกค้าที่ชื่อมีคำว่า "สมชาย" |
| 7 | กรองรัศมี 1.0 กม. | กดปุ่มกรอง มีวงกลมสีฟ้าแสดงขอบเขตรัศมี 1.0 กม. และแสดงเฉพาะลูกค้าที่อยู่ในวงกลม |
| 8 | Git & Build | รัน `npm run build` ผ่าน 100% ไม่มี Lint Error ก่อนเปิด PR เข้า `develop` |
