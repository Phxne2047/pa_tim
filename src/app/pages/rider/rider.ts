import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet';

import { OrderService, DbOrder } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';
import { DeliveryRouteService } from '../../services/delivery-route.service';

interface DbCustomer {
  id?: number | string;
  name?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DeliveryPoint {
  id: number | string;
  type: 'pickup' | 'dropoff';
  title: string;
  customerName?: string;
  address: string;
  phone?: string;
  boxes: number;
  items?: string;
  note?: string;
  status: 'pending' | 'completed';
  lat: number;
  lng: number;
}

interface RiderItem {
  code: string;
  name: string;
  colorClass: string;
}

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rider.html',
  styleUrl: './rider.css'
})
export class Rider implements OnInit, AfterViewInit {
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);
  private routeService = inject(DeliveryRouteService);
  private cdr = inject(ChangeDetectorRef);

  searchQuery = '';
  selectedRiderCode = '';
  notFoundError = false;

  colorPalette = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'];

  allOrders: DbOrder[] = [];
  customerMap = new Map<number | string, DbCustomer>();
  riderList: RiderItem[] = [];

  currentRiderInfo: any = null;

  isOnline = true;
  isLoading = true;

  totalBoxes = 0;
  totalStops = 0;

  deliveryList: DeliveryPoint[] = [];
  private map!: L.Map;
  private routeRequestId = 0;
  private roadCache = new Map<string, [number, number][]>();

  async ngOnInit(): Promise<void> {
    await this.loadAllDataFromDB();
  }

  ngAfterViewInit(): void {
    this.ensureMapInitialized();
  }

  async loadAllDataFromDB(): Promise<void> {
    try {
      this.isLoading = true;

      let dashboardRoutes: any[] = [];
      try {
        const dashboard = await lastValueFrom(this.routeService.getLatest());
        if (dashboard && dashboard.routes) {
          dashboardRoutes = dashboard.routes;
        }
      } catch (e) {}

      const ordersData = await lastValueFrom(this.orderService.getOrders()).catch(() => []);
      this.allOrders = ordersData || [];

      let customersData: any[] = [];
      try {
        customersData = await this.customerService.getCustomers();
      } catch (e) {}

      this.customerMap.clear();
      customersData.forEach((c: DbCustomer) => {
        if (c.id) this.customerMap.set(c.id, c);
      });

      if (dashboardRoutes.length > 0) {
        this.riderList = dashboardRoutes.map((route, index) => ({
          code: route.job_code,
          name: route.rider_name || `ไรเดอร์ ${route.job_code}`,
          colorClass: this.colorPalette[index % this.colorPalette.length]
        }));
      } else {
        const riderMap = new Map<string, string>();
        this.allOrders.forEach((o: any) => {
          if (o.rider_code || o.riderCode) {
            const code = (o.rider_code || o.riderCode).toString().trim().toUpperCase();
            const name = o.rider_name || o.riderName || o.rider || `ไรเดอร์ ${code}`;
            riderMap.set(code, name);
          }
        });
        this.riderList = Array.from(riderMap.entries()).map(([code, name], index) => ({
          code,
          name,
          colorClass: this.colorPalette[index % this.colorPalette.length]
        }));
      }
    } catch (error) {
      this.riderList = [];
      this.deliveryList = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); 
    }
  }

  async processRiderOrders(): Promise<void> {
    const code = this.selectedRiderCode.trim().toUpperCase();
    if (!code) return;

    this.notFoundError = false;
    this.deliveryList = [];

    // เพิ่มตัวแปร name และ fullName ทั้งสองตัวกันเหนียว (เผื่อ HTML เรียกใช้ไม่ตรงกัน)
    this.currentRiderInfo = {
      name: '',
      fullName: '',
      jobId: '',
      shift: 'รอบส่งด่วนมื้อเที่ยง',
      deadline: '12:30 น.',
      estimatedFinish: 'เสร็จ ~11:41 น.',
      earnings: 0,
      totalDistance: 0
    };

    try {
      const dashboard = await lastValueFrom(this.routeService.getLatest());
      const matchedRoute: any = dashboard.routes?.find((r: any) => 
        (r.job_code && r.job_code.toUpperCase() === code)
      );

      if (matchedRoute) {
        const riderName = matchedRoute.rider_name || `ไรเดอร์ ${code}`;
        this.currentRiderInfo.name = riderName;
        this.currentRiderInfo.fullName = riderName;
        this.currentRiderInfo.jobId = matchedRoute.job_code;
        this.currentRiderInfo.totalDistance = matchedRoute.total_distance_km || 0;

        // ถ้าระบบเพื่อนไม่ได้ส่ง array จุดจอด (stops) มาให้ ให้ไปดึงจากออเดอร์ดิบแทน
        let rawStops = matchedRoute.stops && matchedRoute.stops.length > 0 ? matchedRoute.stops : null;
        if (!rawStops) {
          rawStops = this.allOrders.filter((o: any) => {
            const rCode = o.rider_code || o.riderCode || o.job_code;
            return rCode && rCode.toString().trim().toUpperCase() === code;
          });
        }

        let totalBoxesCount = 0;
        
        const dropoffPoints: DeliveryPoint[] = (rawStops || []).map((stop: any, index: number) => {
          // รองรับ Property ทั้งฝั่ง RouteStop และ ฝั่ง DbOrder
          const boxQty = Number(stop.boxes || stop.qty || stop.quantity || 1);
          totalBoxesCount += boxQty;
          const customer = stop.customer_id ? this.customerMap.get(stop.customer_id) : null;
          
          return {
            id: stop.order_id || stop.stop_id || stop.id,
            type: 'dropoff',
            title: `จุดที่ ${index + 1}`,
            customerName: stop.customer_name || customer?.name || stop.customer?.name || `ลูกค้า #${stop.order_id || stop.id}`,
            address: stop.address || customer?.address || 'มหาวิทยาลัยมหาสารคาม',
            phone: stop.customer_phone || stop.phone || customer?.phone || '',
            boxes: boxQty,
            items: stop.menu || stop.items || 'ข้าวกล่องเดลิเวอรี่',
            note: stop.note || stop.remark || '',
            status: stop.status === 'completed' || stop.status === 'delivered' ? 'completed' : 'pending',
            lat: Number(stop.latitude || stop.lat || customer?.latitude || 16.2485 + (index * 0.001)),
            lng: Number(stop.longitude || stop.lng || customer?.longitude || 103.2532 + (index * 0.001))
          };
        });

        // คำนวณรายได้ ถ้าเพื่อนส่งมาเป็น 0 เราคำนวณให้เองเลย (จุดละ 15 บาท + กล่องละ 2 บาท)
        this.currentRiderInfo.earnings = matchedRoute.delivery_fee || ((dropoffPoints.length * 15) + (totalBoxesCount * 2));

        const pickupPoint: DeliveryPoint = {
          id: 'PICKUP',
          type: 'pickup',
          title: dashboard.shop?.name || 'ร้านข้าวกล่องเดลิเวอรี่',
          address: dashboard.shop?.address || 'ตรงข้ามตลาดน้อย มหาวิทยาลัยมหาสารคาม',
          boxes: matchedRoute.total_boxes || totalBoxesCount,
          status: 'completed',
          lat: Number(dashboard.shop?.latitude || 16.246839),
          lng: Number(dashboard.shop?.longitude || 103.251963)
        };

        this.deliveryList = [pickupPoint, ...dropoffPoints];
        this.totalStops = matchedRoute.total_orders || dropoffPoints.length;
        this.totalBoxes = matchedRoute.total_boxes || totalBoxesCount;

        this.updateMapMarkers();
        this.cdr.detectChanges();
        return;
      }
    } catch (error) {}

    // กรณีหาไม่เจอในเส้นทางของเพื่อน ให้หาจากออเดอร์ดิบล้วนๆ
    const riderOrders = this.allOrders.filter((o: any) => {
      const riderCode = o.rider_code || o.riderCode || o.job_code;
      return riderCode && riderCode.toString().trim().toUpperCase() === code;
    });

    const matchedRider = this.riderList.find(r => r.code === code);

    if (!matchedRider && riderOrders.length === 0) {
      this.notFoundError = true;
      this.currentRiderInfo = null;
      this.deliveryList = [];
      this.totalBoxes = 0;
      this.totalStops = 0;
      this.updateMapMarkers();
      this.cdr.detectChanges();
      return;
    }

    const riderName = matchedRider ? matchedRider.name : `ไรเดอร์ ${code}`;
    this.currentRiderInfo.name = riderName;
    this.currentRiderInfo.fullName = riderName;
    this.currentRiderInfo.jobId = code;

    const pickupPoint: DeliveryPoint = {
      id: 'PICKUP',
      type: 'pickup',
      title: 'ร้านข้าวกล่องเดลิเวอรี่',
      address: 'ตรงข้ามตลาดน้อย มหาวิทยาลัยมหาสารคาม',
      boxes: 0,
      status: 'completed',
      lat: 16.246839,
      lng: 103.251963
    };

    let totalBoxesCount = 0;
    const dropoffPoints: DeliveryPoint[] = riderOrders.map((order: any, index: number) => {
      const customer = order.customer_id ? this.customerMap.get(order.customer_id) : null;
      const boxQty = Number(order.boxes || order.qty || order.quantity || 1);
      totalBoxesCount += boxQty;

      return {
        id: order.id,
        type: 'dropoff',
        title: `จุดที่ ${index + 1}`,
        customerName: order.customer_name || customer?.name || order.customer?.name || `ลูกค้า #${order.id}`,
        address: order.address || customer?.address || order.customer?.address || 'มหาวิทยาลัยมหาสารคาม',
        phone: order.phone || customer?.phone || order.customer?.phone || '',
        boxes: boxQty,
        items: order.menu || order.items || 'ข้าวกล่องเดลิเวอรี่',
        note: order.note || order.remark || '',
        status: order.status === 'completed' || order.status === 'delivered' ? 'completed' : 'pending',
        lat: Number(order.latitude || order.lat || customer?.latitude || 16.2485 + (index * 0.001)),
        lng: Number(order.longitude || order.lng || customer?.longitude || 103.2532 + (index * 0.001))
      };
    });

    pickupPoint.boxes = totalBoxesCount;
    this.deliveryList = [pickupPoint, ...dropoffPoints];
    this.totalStops = dropoffPoints.length;
    this.totalBoxes = totalBoxesCount;
    this.currentRiderInfo.earnings = (dropoffPoints.length * 15) + (totalBoxesCount * 2);

    this.updateMapMarkers();
    this.cdr.detectChanges();
  }

  async onSearchRider(): Promise<void> {
    const code = this.searchQuery.trim().toUpperCase();
    this.searchQuery = code;
    this.selectedRiderCode = code;
    await this.processRiderOrders();
  }

  async selectRider(code: string): Promise<void> {
    const upperCode = code.trim().toUpperCase();
    this.searchQuery = upperCode;
    this.selectedRiderCode = upperCode;
    await this.processRiderOrders();
  }

  private ensureMapInitialized(): void {
    setTimeout(() => {
      const mapElement = document.getElementById('riderMap');
      if (mapElement) {
        if (!this.map) {
          this.initMap();
        } else {
          this.map.invalidateSize();
          this.updateMapMarkers();
        }
      } else {
        setTimeout(() => this.ensureMapInitialized(), 150);
      }
    }, 100);
  }

  private initMap(): void {
    const mapContainer = document.getElementById('riderMap');
    if (!mapContainer) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('riderMap').setView([16.246839, 103.251963], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map) return;

    this.routeRequestId++;

    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });

    if (this.deliveryList.length === 0) return;

    const latLngs: [number, number][] = [];

    this.deliveryList.forEach((point, idx) => {
      const lat = isNaN(point.lat) ? 16.246839 : point.lat;
      const lng = isNaN(point.lng) ? 103.251963 : point.lng;

      latLngs.push([lat, lng]);
      L.marker([lat, lng], { icon: this.pinIcon(point, idx) })
        .addTo(this.map)
        .bindPopup(`<b>${point.type === 'pickup' ? point.title : point.customerName}</b><br>${point.address}`);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [25, 25] });
      this.drawRoadRoute(latLngs);
    }

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  }

  // หมุดกลมมีเลขลำดับ ศูนย์กลางอยู่ตรงพิกัด จึงไม่ถูกตัดขอบเหมือนหมุดฟ้าเดิม
  private pinIcon(point: DeliveryPoint, idx: number): L.DivIcon {
    const isPickup = point.type === 'pickup';
    const bg = isPickup ? '#f59e0b' : '#0f172a';
    const label = isPickup ? '🍱' : String(idx);
    return L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bg};color:#fff;font:700 14px/30px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${label}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  }

  // ขอเส้นทางตามถนนผ่าน service ของเพื่อน (ตัวเดียวกับหน้าเส้นทางจัดส่ง)
  private async drawRoadRoute(points: [number, number][]): Promise<void> {
    if (points.length < 2 || !this.map) return;

    const requestId = this.routeRequestId;
    const cacheKey = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
    const style = { color: '#ef4444', weight: 5, opacity: 0.85 };

    const cached = this.roadCache.get(cacheKey);
    if (cached) {
      L.polyline(cached, style).addTo(this.map);
      return;
    }

    // เส้นประตรงๆ แสดงไว้ก่อนระหว่างรอ และเป็นตัวสำรองถ้าขอเส้นทางไม่สำเร็จ
    const fallback = L.polyline(points, { ...style, dashArray: '6 8' }).addTo(this.map);

    try {
      const response = await lastValueFrom(
        this.routeService.getRoadGeometry(
          points.map(([latitude, longitude]) => ({ latitude, longitude }))
        )
      );
      const geometry = response.routes[0]?.geometry.coordinates;
      if (response.code !== 'Ok' || !geometry?.length) return;

      const roadPath = geometry.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
      this.roadCache.set(cacheKey, roadPath);

      // มีการเลือกไรเดอร์ใหม่ระหว่างรอ ให้ทิ้งคำตอบนี้
      if (requestId !== this.routeRequestId || !this.map) return;
      this.map.removeLayer(fallback);
      L.polyline(roadPath, style).addTo(this.map);
    } catch {
      // ขอไม่สำเร็จ ปล่อยเส้นประไว้ ไม่ให้หน้าพัง
    }
  }

  openGoogleMaps(): void {
    if (this.deliveryList.length === 0) {
        window.open('https://www.google.com/maps', '_blank');
        return;
    }
    
    const points = this.deliveryList.map(p => `${p.lat},${p.lng}`).join('/');
    window.open(`https://www.google.com/maps/dir/${points}`, '_blank');
  }
    navUrl(p: DeliveryPoint): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  }

  async toggleStatus(point: DeliveryPoint): Promise<void> {
    const newStatus = point.status === 'completed' ? 'pending' : 'completed';
    point.status = newStatus;

    if (point.type === 'dropoff') {
      try {
        await lastValueFrom(this.orderService.patchOrder(point.id, { status: newStatus }));
      } catch (err) {}
    }
    this.cdr.detectChanges();
  }
}