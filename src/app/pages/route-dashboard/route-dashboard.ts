import { AfterViewChecked, Component, OnDestroy, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { DeliveryRouteService } from '../../services/delivery-route.service';
import { OrderService } from '../../services/order.service';
import { DeliveryRoute, DeliveryRouteResult, RouteStop } from '../../models/route.model';

@Component({
  selector: 'app-route-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-dashboard.html',
  styleUrl: './route-dashboard.css',
})
export class RouteDashboard implements OnInit, AfterViewChecked, OnDestroy {
  private readonly savedDashboardKey = 'pa-tim:last-route-dashboard';
  private readonly routeService = inject(DeliveryRouteService);
  private readonly orderService = inject(OrderService);
  private map?: L.Map;
  private readonly mapLayer = L.layerGroup();
  private readonly roadGeometries = new Map<string | number, L.LatLngExpression[]>();

  dashboard?: DeliveryRouteResult;
  selectedRoute?: DeliveryRoute;
  databaseOrderCount = 0;
  databaseBoxCount = 0;
  isLoading = true;
  isCalculating = false;
  errorMessage = '';
  databaseErrorMessage = '';
  databaseSummaryLoading = true;
  isShowingCachedRoutes = false;
  isLoadingRoadGeometry = false;
  @ViewChild('routeMap') private routeMapElement?: ElementRef<HTMLDivElement>;

  async ngOnInit(): Promise<void> {
    void this.loadDatabaseOrderSummary();
    await this.loadLatestRoutes();
  }

  ngAfterViewChecked(): void {
    if (this.dashboard && !this.map) {
      this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  async calculateRoutes(): Promise<void> {
    this.isCalculating = true;
    this.errorMessage = '';
    try {
      this.dashboard = await lastValueFrom(this.routeService.optimize());
      this.selectedRoute = undefined;
      this.isShowingCachedRoutes = false;
      this.roadGeometries.clear();
      this.saveDashboard(this.dashboard);
      void this.loadDatabaseOrderSummary();
      this.initializeMap();
      void this.drawRoutes();
    } catch (error) {
      console.error('Route optimization failed:', error);
      this.errorMessage = 'คำนวณเส้นทางไม่สำเร็จหรือใช้เวลานานเกิน 45 วินาที กรุณาลองใหม่อีกครั้ง';
    } finally {
      this.isCalculating = false;
    }
  }

  selectRoute(route: DeliveryRoute): void {
    this.selectedRoute = this.selectedRoute?.job_code === route.job_code ? undefined : route;
    void this.drawRoutes();
  }

  openMap(url?: string): void {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  routeColor(route: DeliveryRoute): string {
    return route.route_color || '#2563eb';
  }

  stopName(stop: RouteStop): string {
    return stop.customer_name || `ลูกค้า #${stop.order_id}`;
  }

  private async loadLatestRoutes(): Promise<void> {
    const restored = this.restoreSavedDashboard();
    this.applyDashboardOrderSummary();

    try {
      this.dashboard = await lastValueFrom(this.routeService.getLatest());
      this.selectedRoute = undefined;
      this.isShowingCachedRoutes = false;
      this.roadGeometries.clear();
      this.saveDashboard(this.dashboard);
      this.applyDashboardOrderSummary();
      this.errorMessage = '';
    } catch {
      if (!restored) {
        this.errorMessage = 'ยังไม่มีผลการจัดเส้นทางล่าสุดจาก backend กด “คำนวณเส้นทางใหม่” เพื่อเริ่มต้น';
      } else {
        this.isShowingCachedRoutes = true;
        this.errorMessage = 'ไม่สามารถเชื่อมต่อ backend ได้ กำลังแสดงข้อมูลที่บันทึกไว้ล่าสุด';
      }
    } finally {
      this.isLoading = false;
      this.initializeMap();
      void this.drawRoutes();
    }
  }

  private applyDashboardOrderSummary(): void {
    const summary = this.dashboard?.financial_dashboard;
    if (!summary || !this.databaseSummaryLoading) return;

    this.databaseOrderCount = Number(summary.total_orders) || 0;
    this.databaseBoxCount = Number(summary.total_boxes) || 0;
    this.databaseSummaryLoading = false;
  }

  private restoreSavedDashboard(): boolean {
    try {
      const saved = localStorage.getItem(this.savedDashboardKey);
      if (!saved) return false;

      const dashboard = JSON.parse(saved) as DeliveryRouteResult;
      if (dashboard.shop && Array.isArray(dashboard.routes)) {
        this.dashboard = dashboard;
        this.selectedRoute = undefined;
        this.isShowingCachedRoutes = true;
        this.roadGeometries.clear();
        return true;
      }

      return false;
    } catch (error) {
      console.warn('ไม่สามารถโหลดข้อมูลเส้นทางที่บันทึกไว้ได้:', error);
      localStorage.removeItem(this.savedDashboardKey);
      return false;
    }
  }

  private saveDashboard(dashboard: DeliveryRouteResult): void {
    try {
      localStorage.setItem(this.savedDashboardKey, JSON.stringify(dashboard));
    } catch (error) {
      console.warn('ไม่สามารถบันทึกข้อมูลเส้นทางไว้ในเครื่องได้:', error);
    }
  }

  private async loadDatabaseOrderSummary(): Promise<void> {
    try {
      const orders = await lastValueFrom(this.orderService.getOrders());
      this.databaseOrderCount = orders.length;
      this.databaseBoxCount = orders.reduce((total, order) => total + Number(order.boxes || 0), 0);
      this.databaseErrorMessage = '';
    } catch {
      this.databaseOrderCount = 0;
      this.databaseBoxCount = 0;
      this.databaseErrorMessage = 'โหลดจำนวนออเดอร์จากฐานข้อมูลไม่สำเร็จ กรุณาลองโหลดหน้าใหม่';
    } finally {
      this.databaseSummaryLoading = false;
    }
  }

  private initializeMap(): void {
    if (this.map) return;
    const mapElement = this.routeMapElement?.nativeElement;
    if (!mapElement) return;

    this.map = L.map(mapElement, { zoomControl: false }).setView([16.246839, 103.251963], 13);
    L.control.zoom({ position: 'topleft' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.mapLayer.addTo(this.map);
    void this.drawRoutes();
  }

  private async drawRoutes(): Promise<void> {
    if (!this.map || !this.dashboard) return;
    const shop = this.dashboard.shop;
    const shopPoint: L.LatLngExpression = [Number(shop.latitude), Number(shop.longitude)];
    //เลือกเสน้ทางที่เลือกไว้ ถ้าไม่มีให้ใช้เส้นทางทั้งหมด
    const routes = this.selectedRoute ? [this.selectedRoute] : this.dashboard.routes;
    this.renderRouteLayers(routes, shopPoint, shop.name);
    //โหลด geometry ของเส้นทางที่ยังไม่มีในแผนที่
    const routesToLoad = routes.filter((route) => !this.roadGeometries.has(route.job_code));
    if (routesToLoad.length === 0) return;

    this.isLoadingRoadGeometry = true;
    //ดึงเส้นทาง
    await Promise.all(routesToLoad.map((route) => this.loadRoadGeometry(route, Number(shop.latitude), Number(shop.longitude))));
    this.isLoadingRoadGeometry = false;
    if (!this.map || !this.dashboard) return;
    this.renderRouteLayers(routes, shopPoint, shop.name);
  }

  // แสดงเส้นทางและจุดหยุดบนแผนที่
  private renderRouteLayers(
    routes: DeliveryRoute[],
    shopPoint: L.LatLngExpression,
    shopName: string,
  ): void {
    if (!this.map) return;
    this.mapLayer.clearLayers();
    const bounds = L.latLngBounds([]);
    // แสดงจุดร้านค้า
    L.marker(shopPoint, {
      icon: L.divIcon({ className: 'shop-marker', html: '🍱', iconSize: [34, 34], iconAnchor: [17, 17] }),
    }).bindPopup(`<strong>${shopName}</strong>`).addTo(this.mapLayer);
    bounds.extend(shopPoint);

    for (const route of routes) {
      const fallbackPoints: L.LatLngExpression[] = [
        shopPoint,
        ...route.stops.map((stop) => [Number(stop.latitude), Number(stop.longitude)] as L.LatLngExpression),
      ];

      const points = this.roadGeometries.get(route.job_code) || fallbackPoints;
      // แสดงจุดหยุดและเส้นทาง
      route.stops.forEach((stop, index) => {
        const point: L.LatLngExpression = [Number(stop.latitude), Number(stop.longitude)];
        bounds.extend(point);
        L.marker(point, {
          icon: L.divIcon({
            className: 'route-marker',
            html: `<span style="background:${this.routeColor(route)}">${index + 1}</span>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).bindPopup(`<strong>${this.stopName(stop)}</strong><br>${stop.address || ''}<br>${stop.boxes} กล่อง`)
          .addTo(this.mapLayer);
      });
      // แสดงเส้นทางระหว่างจุดหยุด
      if (points.length > 1) {
        L.polyline(points, { color: this.routeColor(route), weight: 5, opacity: 0.8 }).addTo(this.mapLayer);
      }
    }
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.12));
    this.map.invalidateSize();
  }

  private async loadRoadGeometry(route: DeliveryRoute, shopLatitude: number, shopLongitude: number): Promise<void> {
    const points = [
      { latitude: shopLatitude, longitude: shopLongitude },
      ...route.stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    ];
    const fallback = points.map((point) => [Number(point.latitude), Number(point.longitude)] as L.LatLngExpression);
    if (points.length < 2 || points.some((point) => !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude)))) {
      this.roadGeometries.set(route.job_code, fallback);
      return;
    }
    try {
      const response = await lastValueFrom(this.routeService.getRoadGeometry(points));
      const geometry = response.routes[0]?.geometry.coordinates;
      if (response.code === 'Ok' && geometry?.length) {
        this.roadGeometries.set(route.job_code, geometry.map(([longitude, latitude]) => [latitude, longitude]));
      } else {
        this.roadGeometries.set(route.job_code, fallback);
      }
    } catch {
      this.roadGeometries.set(route.job_code, fallback);
    }
  }
}
