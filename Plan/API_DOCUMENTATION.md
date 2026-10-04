# 📖 API Documentation - PaTim Delivery Backend
> ระบบ Web API จัดการข้อมูลลูกค้า, ออเดอร์, จัดสรรเส้นทาง และระบบไรเดอร์ ร้านป้าติ๋ม ข้าวกล่องเดลิเวอรี (ส่งด่วนมื้อเที่ยง)  
> อ้างอิงโครงสร้างฐานข้อมูลตรงตาม **ER Diagram** ครบทั้ง 5 ตาราง (`customers`, `riders`, `orders`, `delivery_routes`, `route_stops`)  
> **Base URL:** `http://localhost:3000/api`

---

## 📍 ข้อมูลพิกัดร้านค้าอ้างอิง (Shop Reference)
- **ชื่อร้าน:** ร้านป้าติ๋ม ข้าวกล่องเดลิเวอรี (ส่งด่วนมื้อเที่ยง)
- **ที่อยู่:** คณะวิทยาการสารสนเทศ มหาวิทยาลัยมหาสารคาม
- **เบอร์โทร:** `081-795-8189`
- **พิกัดร้าน:** `Latitude: 16.246839`, `Longitude: 103.251963`
- **รัศมีบริการสูงสุด:** `3.0` กิโลเมตร (ระยะออเดอร์ใกล้ร้าน: `2.0` กิโลเมตร)
- **เวลาเริ่มจัดส่ง:** `11:30 น.` – สิ้นสุดไม่เกิน `12:30 น.` ($\le 60$ นาที)

---

## 📋 สรุปรายการ Endpoint ทั้งหมด (API Collection Summary)

### 👥 1. กลุ่ม API ข้อมูลลูกค้า (`/customers`) - สมาชิกลำดับที่ 1
| Method | Endpoint | ชื่อใน Collection | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| **GET** | `/customers` | `get customers` | ดึงรายการข้อมูลลูกค้าทั้งหมด |
| **GET** | `/customers/near` | `customer/near` | ค้นหาลูกค้าในรัศมีร้านค้า (`?km=1.0`) |
| **GET** | `/customers/search` | `customer/search` | ค้นหาลูกค้าตาม ID หรือ ชื่อ (`?id=...&name=...`) |
| **GET** | `/customers/:id` | `customers/id` | ดึงข้อมูลลูกค้ารายบุคคลตาม ID |
| **POST** | `/customers` | `customers` | เพิ่มข้อมูลลูกค้าใหม่ (สร้าง ID อัตโนมัติถ้าไม่ระบุ) |
| **PUT** | `/customers/:id` | `update customers` | แก้ไขข้อมูลลูกค้าทั้งหมดตาม ID (Full Update) |
| **PATCH** | `/customers/:id` | `patch customers` | แก้ไขข้อมูลลูกค้าเฉพาะบางฟิลด์ตาม ID (Partial Update) |
| **DELETE** | `/customers/:id` | `delete customers id` | ลบข้อมูลลูกค้าตาม ID |

### 🍱 2. กลุ่ม API รายการสั่งซื้อ (`/orders`) - สมาชิกลำดับที่ 2
| Method | Endpoint | ชื่อใน Collection | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| **GET** | `/orders` | `orders` | ดึงรายการสั่งซื้อทั้งหมด พร้อมข้อมูลลูกค้าและระยะทาง |
| **GET** | `/orders/near` | `orders near` | แสดงรายการสั่งซื้อในระยะกำหนด (`?km=2.0`) |
| **GET** | `/orders/search` | `orders search` | ค้นหาออเดอร์ตามเงื่อนไข (ID, ลูกค้า, เมนู, สถานะ) |
| **GET** | `/orders/:id` | `get orders id` | ดึงข้อมูลคำสั่งซื้อเดี่ยวตาม ID |
| **POST** | `/orders` | `post orders` | เพิ่มรายการคำสั่งซื้อใหม่ (1–3 กล่อง) |
| **POST** | `/orders/simulate` | `orders simulate` | จำลองรายการสั่งซื้อ 20–30 รายการ พร้อมข้อมูลครบถ้วน |
| **PUT** | `/orders/:id` | `update orders` | แก้ไขข้อมูลคำสั่งซื้อทั้งหมดตาม ID (Full Update) |
| **PATCH** | `/orders/:id` | `patch orders` | แก้ไขจำนวนกล่องหรือข้อมูลเฉพาะฟิลด์ (Partial Update) |
| **DELETE** | `/orders/:id` | `delete orders id` | ลบรายการคำสั่งซื้อเดี่ยวตาม ID |
| **DELETE** | `/orders/all` | `delete orders all` | ล้าง (ลบทั้งหมด) รายการคำสั่งซื้อทั้งหมด |

### 🗺️ 3. กลุ่ม API จัดเส้นทาง & ไรเดอร์ (`/riders`, `/delivery-routes`) - สมาชิกลำดับที่ 3 & 4
| Method | Endpoint | ชื่อใน Collection | ผู้รับผิดชอบ & คำอธิบาย |
| :--- | :--- | :--- | :--- |
| **GET** | `/riders` | `get riders` | **คนที่ 3:** ดึงข้อมูลไรเดอร์ทั้งหมดและรหัสสีประจำตัว |
| **GET** | `/delivery-routes` | `get delivery routes` | **คนที่ 3:** ดึงข้อมูลสายส่งและสรุปผลกำไรสุทธิ |
| **POST** | `/delivery-routes` | `create delivery routes` | **คนที่ 3:** บันทึกผลการจัดสรรเส้นทางและสร้างใบงานไรเดอร์ |
| **GET** | `/delivery-routes/:jobCode` | `get rider job` | **คนที่ 4:** ไรเดอร์ค้นหา Job Code ดูจำนวนกล่องและลำดับจุดส่ง 1, 2, 3 |
| **PATCH** | `/delivery-routes/:jobCode/stops/:stopId` | `update stop status` | **คนที่ 4:** ไรเดอร์อัปเดตสถานะจุดส่ง (`delivered`) พร้อมเวลา |

---

# 👥 หมวดที่ 1: จัดการข้อมูลลูกค้า (`/customers`)

### 1. `GET /customers`
ดึงรายชื่อลูกค้าทั้งหมดในระบบ พร้อมพิกัดสำหรับปักหมุดแผนที่ Leaflet

- **Method:** `GET`
- **URL:** `/customers`

#### Response (`200 OK`):
```json
[
  {
    "id": "CUST-001",
    "name": "กิตติศักดิ์ พลสว่าง",
    "phone": "0812345678",
    "address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
    "latitude": 16.248231,
    "longitude": 103.250125,
    "created_at": "2026-10-03T20:00:00.000Z"
  }
]
```

---

### 2. `GET /customers/near`
ค้นหาลูกค้าที่อยู่ในรัศมีระยะทางที่กำหนดจากร้านค้า เรียงจากใกล้ไปไกล

- **Method:** `GET`
- **URL:** `/customers/near?km=1.0`

#### Response (`200 OK`):
```json
[
  {
    "id": "CUST-023",
    "name": "นพรัตน์ แสนสุข",
    "phone": "0836789014",
    "address": "สำนักวิทยบริการ (ห้องสมุด มมส)",
    "latitude": 16.2452,
    "longitude": 103.2518,
    "distance_km": 0.18,
    "created_at": "2026-10-03T20:55:00.000Z"
  }
]
```

---

### 3. `GET /customers/search`
ค้นหาลูกค้าตาม ID หรือชื่อ

- **Method:** `GET`
- **URL:** `/customers/search?name=สมชาย`

#### Response (`200 OK`):
```json
[
  {
    "id": "CUST-001",
    "name": "กิตติศักดิ์ พลสว่าง",
    "phone": "0812345678",
    "address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
    "latitude": 16.248231,
    "longitude": 103.250125,
    "created_at": "2026-10-03T20:00:00.000Z"
  }
]
```

---

### 4. `GET /customers/:id`
ดึงข้อมูลลูกค้าเฉพาะรายตาม ID

- **Method:** `GET`
- **URL:** `/customers/:id` (เช่น `/customers/CUST-001`)

#### Response (`200 OK`):
```json
{
  "id": "CUST-001",
  "name": "กิตติศักดิ์ พลสว่าง",
  "phone": "0812345678",
  "address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
  "latitude": 16.248231,
  "longitude": 103.250125,
  "created_at": "2026-10-03T20:00:00.000Z"
}
```

---

### 5. `POST /customers`
เพิ่มข้อมูลลูกค้าใหม่

- **Method:** `POST`
- **URL:** `/customers`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "สมชาย สุขใจ",
  "phone": "0891112233",
  "address": "หอพักศิริพร ห้อง 101 ท่าขอนยาง",
  "latitude": 16.2475,
  "longitude": 103.251
}
```

#### Response (`201 Created`):
```json
{
  "affected_row": 1,
  "last_id": "CUST-027",
  "customer": {
    "id": "CUST-027",
    "name": "สมชาย สุขใจ",
    "phone": "0891112233",
    "address": "หอพักศิริพร ห้อง 101 ท่าขอนยาง",
    "latitude": 16.2475,
    "longitude": 103.251,
    "created_at": "2026-10-04T10:00:00.000Z"
  }
}
```

---

### 6. `PUT /customers/:id`
แก้ไขข้อมูลลูกค้าทั้งหมดตาม ID

- **Method:** `PUT`
- **URL:** `/customers/:id` (เช่น `/customers/CUST-001`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "กิตติศักดิ์ พลสว่าง (แก้ไข)",
  "phone": "0819998888",
  "address": "หอพักกัญญาพัชร ห้อง 305 ซอยเจริญผล ท่าขอนยาง",
  "latitude": 16.248231,
  "longitude": 103.250125
}
```

#### Response (`200 OK`):
```json
{
  "affected_row": 1,
  "message": "Customer updated successfully"
}
```

---

### 7. `PATCH /customers/:id`
แก้ไขข้อมูลลูกค้าเฉพาะบางฟิลด์

- **Method:** `PATCH`
- **URL:** `/customers/:id`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "0898887766"
}
```

#### Response (`200 OK`):
```json
{
  "affected_row": 1,
  "message": "Customer patched successfully"
}
```

---

### 8. `DELETE /customers/:id`
ลบข้อมูลลูกค้าตาม ID

- **Method:** `DELETE`
- **URL:** `/customers/:id` (เช่น `/customers/CUST-027`)

#### Response (`200 OK`):
```json
{
  "affected_row": 1,
  "message": "Customer CUST-027 deleted successfully"
}
```

---

# 🍱 หมวดที่ 2: จัดการรายการสั่งซื้อ (`/orders`)

### 9. `GET /orders`
ดึงรายการคำสั่งซื้อทั้งหมด พร้อม JOIN ข้อมูลลูกค้าและระยะทางจากร้านค้า

- **Method:** `GET`
- **URL:** `/orders`

#### Response (`200 OK`):
```json
[
  {
    "id": "ORD-001",
    "customer_id": "CUST-001",
    "boxes": 2,
    "menu": "ข้าวกะเพราหมูสับไข่เค็ม",
    "status": "pending",
    "created_at": "2026-10-04T03:00:44.000Z",
    "customer_name": "กิตติศักดิ์ พลสว่าง",
    "customer_phone": "0812345678",
    "customer_address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
    "customer_latitude": 16.248231,
    "customer_longitude": 103.250125,
    "distance_km": 0.25
  }
]
```

---

### 10. `GET /orders/near`
แสดงรายการสั่งซื้อทั้งหมดในระยะที่กำหนดจากพิกัดร้านค้า (ค่าเริ่มต้น 2.0 กิโลเมตร)

- **Method:** `GET`
- **URL:** `/orders/near?km=2.0`

#### Response (`200 OK`):
```json
[
  {
    "id": "ORD-018",
    "customer_id": "CUST-023",
    "boxes": 1,
    "menu": "ข้าวกะเพราไก่ไข่ดาว",
    "status": "pending",
    "created_at": "2026-10-04T03:17:10.000Z",
    "customer_name": "นพรัตน์ แสนสุข",
    "customer_phone": "0836789014",
    "customer_address": "สำนักวิทยบริการ (ห้องสมุด มมส)",
    "customer_latitude": 16.2452,
    "customer_longitude": 103.2518,
    "distance_km": 0.18
  }
]
```

---

### 11. `GET /orders/search`
ค้นหารายการคำสั่งซื้อตามเงื่อนไข

- **Method:** `GET`
- **URL:** `/orders/search?status=pending`

#### Response (`200 OK`):
```json
[
  {
    "id": "ORD-001",
    "customer_id": "CUST-001",
    "boxes": 2,
    "menu": "ข้าวกะเพราหมูสับไข่เค็ม",
    "status": "pending",
    "created_at": "2026-10-04T03:00:44.000Z",
    "customer_name": "กิตติศักดิ์ พลสว่าง",
    "customer_phone": "0812345678",
    "customer_address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
    "customer_latitude": 16.248231,
    "customer_longitude": 103.250125,
    "distance_km": 0.25
  }
]
```

---

### 12. `GET /orders/:id`
ดึงข้อมูลคำสั่งซื้อเดี่ยวตาม ID

- **Method:** `GET`
- **URL:** `/orders/:id` (เช่น `/orders/ORD-001`)

#### Response (`200 OK`):
```json
{
  "id": "ORD-001",
  "customer_id": "CUST-001",
  "boxes": 2,
  "menu": "ข้าวกะเพราหมูสับไข่เค็ม",
  "status": "pending",
  "created_at": "2026-10-04T03:00:44.000Z",
  "customer_name": "กิตติศักดิ์ พลสว่าง",
  "customer_phone": "0812345678",
  "customer_address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
  "customer_latitude": 16.248231,
  "customer_longitude": 103.250125,
  "distance_km": 0.25
}
```

---

### 13. `POST /orders`
เพิ่มรายการคำสั่งซื้อใหม่ (1–3 กล่อง)

- **Method:** `POST`
- **URL:** `/orders`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "customer_id": "CUST-001",
  "boxes": 2,
  "menu": "ข้าวกะเพราหมูกรอบไข่ดาว"
}
```

#### Response (`201 Created`):
```json
{
  "message": "Order created successfully",
  "affected_row": 1,
  "last_id": "ORD-026"
}
```

---

### 14. `POST /orders/simulate`
จำลองรายการสั่งซื้อ 20–30 รายการ โดยสุ่มจับคู่ลูกค้าจริงในระบบ สุ่มกล่อง **1–3 กล่อง**

- **Method:** `POST`
- **URL:** `/orders/simulate`
- **Headers:** `Content-Type: application/json`
- **Request Body (Optional):**
```json
{
  "count": 25,
  "clear_existing": true
}
```

#### Response (`201 Created`):
```json
{
  "message": "Successfully simulated 25 orders.",
  "count": 25,
  "orders": [
    {
      "id": "ORD-001",
      "customer_id": "CUST-001",
      "boxes": 2,
      "menu": "ข้าวกะเพราหมูสับไข่เค็ม",
      "status": "pending",
      "created_at": "2026-10-04T03:00:44.000Z",
      "customer_name": "กิตติศักดิ์ พลสว่าง",
      "customer_phone": "0812345678",
      "customer_address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
      "customer_latitude": 16.248231,
      "customer_longitude": 103.250125,
      "distance_km": 0.25
    }
  ]
}
```

---

### 15. `PUT /orders/:id`
แก้ไขข้อมูลคำสั่งซื้อทั้งหมดตาม ID

- **Method:** `PUT`
- **URL:** `/orders/:id`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "customer_id": "CUST-002",
  "boxes": 3,
  "menu": "ข้าวผัดต้มยำกุ้ง",
  "status": "assigned"
}
```

#### Response (`200 OK`):
```json
{
  "message": "Order updated successfully",
  "affected_row": 1
}
```

---

### 16. `PATCH /orders/:id`
แก้ไขจำนวนกล่องหรือสถานะเฉพาะฟิลด์

- **Method:** `PATCH`
- **URL:** `/orders/:id`
- **Headers:** `Content-Type: application/json`
- **Request Body Example:**
```json
{
  "boxes": 3
}
```

#### Response (`200 OK`):
```json
{
  "message": "Order patched successfully",
  "affected_row": 1
}
```

---

### 17. `DELETE /orders/:id`
ลบรายการคำสั่งซื้อเดี่ยวตาม ID

- **Method:** `DELETE`
- **URL:** `/orders/:id` (เช่น `/orders/ORD-026`)

#### Response (`200 OK`):
```json
{
  "message": "Order ORD-026 deleted successfully.",
  "affected_row": 1
}
```

---

### 18. `DELETE /orders/all`
ล้างรายการคำสั่งซื้อทั้งหมดในระบบ

- **Method:** `DELETE`
- **URL:** `/orders/all`

#### Response (`200 OK`):
```json
{
  "message": "Successfully cleared all orders.",
  "affected_rows": 25
}
```

---

# 🗺️ หมวดที่ 3: จัดสรรเส้นทาง & ไรเดอร์ (`/riders`, `/delivery-routes`)

### 19. `GET /riders`
ดึงรายชื่อไรเดอร์และรหัสสีสำหรับวาดแผนที่ Leaflet

- **Method:** `GET`
- **URL:** `/riders`

#### Response (`200 OK`):
```json
[
  { "id": "RD-01", "name": "คุณสมชาย ใจดี", "phone": "0899998888", "color": "#EF4444" },
  { "id": "RD-02", "name": "คุณวิชัย มุ่งมั่น", "phone": "0812223333", "color": "#10B981" },
  { "id": "RD-03", "name": "คุณประสิทธิ์ รวดเร็ว", "phone": "0864445555", "color": "#3B82F6" },
  { "id": "RD-04", "name": "คุณอนันต์ ว่องไว", "phone": "0876667777", "color": "#F59E0B" },
  { "id": "RD-05", "name": "คุณธนากร ตรงเวลา", "phone": "0858889999", "color": "#8B5CF6" }
]
```

---

### 20. `GET /delivery-routes`
ดึงข้อมูลสายส่งทั้งหมด พร้อมคำนวณสรุปกำไรสุทธิ

- **Method:** `GET`
- **URL:** `/delivery-routes`

#### Response (`200 OK`):
```json
[
  {
    "id": "ROUTE-01",
    "rider_id": "RD-01",
    "job_code": "JOB-MSU-01",
    "total_orders": 3,
    "total_boxes": 8,
    "total_distance": 3.80,
    "time_delivery": 28.0,
    "delivery_price": 45.40,
    "net_profit": 154.60,
    "status": "assigned",
    "rider_name": "คุณสมชาย ใจดี",
    "rider_phone": "0899998888",
    "rider_color": "#EF4444"
  }
]
```

---

### 21. `POST /delivery-routes`
บันทึกผลการจัดสรรเส้นทางและสร้างใบงานไรเดอร์ (`JOB-MSU-xx`) พร้อมจุดส่งใน `route_stops`

- **Method:** `POST`
- **URL:** `/delivery-routes`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "routes": [
    {
      "id": "ROUTE-01",
      "rider_id": "RD-01",
      "job_code": "JOB-MSU-01",
      "total_orders": 3,
      "total_boxes": 8,
      "total_distance": 3.80,
      "time_delivery": 28.0,
      "delivery_price": 45.40,
      "net_profit": 154.60,
      "status": "assigned",
      "stops": [
        {
          "id": "STOP-001",
          "order_id": "ORD-001",
          "stop_number": 1,
          "distance_before": 0.25,
          "total_time": 5.0,
          "status": "pending"
        },
        {
          "id": "STOP-002",
          "order_id": "ORD-018",
          "stop_number": 2,
          "distance_before": 1.20,
          "total_time": 15.0,
          "status": "pending"
        },
        {
          "id": "STOP-003",
          "order_id": "ORD-027",
          "stop_number": 3,
          "distance_before": 2.35,
          "total_time": 28.0,
          "status": "pending"
        }
      ]
    }
  ]
}
```

#### Response (`201 Created`):
```json
{
  "message": "Delivery routes created successfully.",
  "total_routes": 1,
  "job_codes": ["JOB-MSU-01"]
}
```

---

### 22. `GET /delivery-routes/:jobCode`
ไรเดอร์ค้นหา Job Code ดูจำนวนกล่องและลำดับจุดส่ง 1, 2, 3

- **Method:** `GET`
- **URL:** `/delivery-routes/:jobCode` (เช่น `/delivery-routes/JOB-MSU-01`)

#### Response (`200 OK`):
```json
{
  "id": "ROUTE-01",
  "rider_id": "RD-01",
  "rider_name": "คุณสมชาย ใจดี",
  "rider_phone": "0899998888",
  "job_code": "JOB-MSU-01",
  "total_orders": 3,
  "total_boxes": 8,
  "total_distance": 3.80,
  "time_delivery": 28.0,
  "delivery_price": 45.40,
  "net_profit": 154.60,
  "status": "in_progress",
  "stops": [
    {
      "id": "STOP-001",
      "route_id": "ROUTE-01",
      "order_id": "ORD-001",
      "stop_number": 1,
      "distance_before": 0.25,
      "total_time": 5.0,
      "status": "delivered",
      "delivered_at": "2026-10-04T04:42:00.000Z",
      "customer_name": "กิตติศักดิ์ พลสว่าง",
      "phone": "0812345678",
      "address": "หอพักกัญญาพัชร ห้อง 302 ซอยเจริญผล ท่าขอนยาง",
      "latitude": 16.248231,
      "longitude": 103.250125,
      "boxes": 3
    },
    {
      "id": "STOP-002",
      "route_id": "ROUTE-01",
      "order_id": "ORD-018",
      "stop_number": 2,
      "distance_before": 1.20,
      "total_time": 15.0,
      "status": "in_progress",
      "delivered_at": null,
      "customer_name": "นพรัตน์ แสนสุข",
      "phone": "0836789014",
      "address": "สำนักวิทยบริการ (ห้องสมุด มมส)",
      "latitude": 16.2452,
      "longitude": 103.2518,
      "boxes": 2
    },
    {
      "id": "STOP-003",
      "route_id": "ROUTE-01",
      "order_id": "ORD-027",
      "stop_number": 3,
      "distance_before": 2.35,
      "total_time": 28.0,
      "status": "pending",
      "delivered_at": null,
      "customer_name": "สมชาย สุขใจ",
      "phone": "0891112233",
      "address": "หอพักศิริพร ห้อง 101 ท่าขอนยาง",
      "latitude": 16.2475,
      "longitude": 103.251,
      "boxes": 3
    }
  ]
}
```

---

### 23. `PATCH /delivery-routes/:jobCode/stops/:stopId`
ไรเดอร์กดอัปเดตสถานะจุดส่ง (`delivered`) พร้อมบันทึก `delivered_at`

- **Method:** `PATCH`
- **URL:** `/delivery-routes/:jobCode/stops/:stopId` (เช่น `/delivery-routes/JOB-MSU-01/stops/STOP-002`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "status": "delivered"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "job_code": "JOB-MSU-01",
  "stop_id": "STOP-002",
  "status": "delivered",
  "delivered_at": "2026-10-04T04:58:00.000Z"
}
```
