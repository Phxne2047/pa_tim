import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private viewDestroyed = false;
  private refreshQueued = false;
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
    this.viewDestroyed = true;
    this.map?.remove();
  }

  async calculateRoutes(): Promise<void> {
    if (this.isCalculating) return;

    this.isCalculating = true;
    this.errorMessage = '';
    this.refreshView();
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
      this.refreshView();
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

    let loadedFromApi = false;
    try {
      this.dashboard = await lastValueFrom(this.routeService.getLatest());
      this.selectedRoute = undefined;
      this.isShowingCachedRoutes = false;
      this.roadGeometries.clear();
      this.saveDashboard(this.dashboard);
      this.applyDashboardOrderSummary();
      this.errorMessage = '';
      loadedFromApi = true;
    } catch {
      if (!restored) {
        this.errorMessage = 'ยังไม่มีผลการจัดเส้นทางล่าสุดจาก backend กด “คำนวณเส้นทางใหม่” เพื่อเริ่มต้น';
      } else {
        this.isShowingCachedRoutes = true;
        this.errorMessage = 'ไม่สามารถเชื่อมต่อ backend ได้ กำลังแสดงข้อมูลที่บันทึกไว้ล่าสุด';
      }
    } finally {
      this.isLoading = false;
      const openedToCalculate = this.activatedRoute.snapshot.queryParamMap.get('calculate') === '1';
      const savedRoutesCannotBeDrawn = loadedFromApi && this.routesNeedCalculation(this.dashboard);
      if ((openedToCalculate || savedRoutesCannotBeDrawn) && !this.isShowingCachedRoutes) {
        if (openedToCalculate) {
          void this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { calculate: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
        await this.calculateRoutes();
        return;
      }
      this.initializeMap();
      void this.drawRoutes();
      this.refreshView();
    }
  }

  private routesNeedCalculation(dashboard?: DeliveryRouteResult): boolean {
    const routes = dashboard?.routes ?? [];
    if (routes.length === 0) return true;
    return routes.some((route) => this.routeCannotBeDrawn(route));
  }

  private routeCannotBeDrawn(route: DeliveryRoute): boolean {
    if (!route.stops?.length) return true;
    return route.stops.some((stop) => {
      const latitude = Number(stop.latitude);
      const longitude = Number(stop.longitude);
      return !Number.isFinite(latitude) || !Number.isFinite(longitude);
    });
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
      this.refreshView();
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
    this.refreshView();
    //ดึงเส้นทาง
    await Promise.all(routesToLoad.map((route) => this.loadRoadGeometry(route, Number(shop.latitude), Number(shop.longitude))));
    this.isLoadingRoadGeometry = false;
    if (!this.map || !this.dashboard) {
      this.refreshView();
      return;
    }
    this.renderRouteLayers(routes, shopPoint, shop.name);
    this.refreshView();
  }

  // แอปนี้ไม่มี Zone.js งานที่อยู่หลัง await จึงต้องสั่งวาดหน้าเอง
  // เลื่อนออกจากรอบ change detection ปัจจุบัน เพื่อไม่ให้ชนกับ AfterViewChecked
  private refreshView(): void {
    if (this.viewDestroyed || this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      if (this.viewDestroyed) return;
      try {
        this.changeDetector.detectChanges();
      } catch (error) {
        console.error('วาดแผนที่ใหม่ไม่สำเร็จ:', error);
      }
    });
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
    const shopLatLng = L.latLng(shopPoint);
    bounds.extend(shopLatLng);

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
        L.polyline(points, { color: this.routeColor(route), weight: 5, opacity: 0.85 }).addTo(this.mapLayer);
      }
    }

    const shopSharesStop = routes.some((route) =>
      route.stops.some((stop) => shopLatLng.distanceTo([Number(stop.latitude), Number(stop.longitude)]) < 25),
    );
    // วาดร้านทีหลังและยกให้สูงกว่าหมุดจุดส่ง แม้พิกัดจะซ้อนกันก็ยังเห็นทั้งสองอัน
    L.marker(shopLatLng, {
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: shopSharesStop ? 'shop-marker is-stacked' : 'shop-marker',
        html: shopSharesStop ? '<span class="shop-badge">🍱</span><span class="shop-stem"></span>' : '<span class="shop-badge">🍱</span>',
        iconSize: shopSharesStop ? [36, 62] : [36, 36],
        iconAnchor: shopSharesStop ? [18, 62] : [18, 18],
      }),
    }).bindPopup(`<strong>${shopName}</strong><br>จุดเริ่มต้นจัดส่ง`).addTo(this.mapLayer);
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
        this.roadGeometries.set(route.job_code, this.attachAnchors(geometry, response.waypoints, points));
      } else {
        this.roadGeometries.set(route.job_code, fallback);
      }
    } catch {
      this.roadGeometries.set(route.job_code, fallback);
    }
  }

  // เส้นจาก OSRM อยู่บนถนน จึงต่อปลายเส้นเข้าพิกัดร้านและจุดส่งจริง
  private attachAnchors(
    geometry: Array<[number, number]>,
    waypoints: Array<{ location: [number, number] }> | undefined,
    anchors: Array<{ latitude: number | string; longitude: number | string }>,
  ): L.LatLngExpression[] {
    const road = geometry.map(([longitude, latitude]) => L.latLng(latitude, longitude));
    const exact = anchors.map((anchor) => L.latLng(Number(anchor.latitude), Number(anchor.longitude)));
    const snapped = waypoints?.length === exact.length
      ? waypoints.map((waypoint) => L.latLng(waypoint.location[1], waypoint.location[0]))
      : exact;
    const connected: L.LatLng[] = [];
    let cursor = 0;

    exact.forEach((anchor, index) => {
      const target = snapped[index];
      let bestIndex = cursor;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let pointIndex = cursor; pointIndex < road.length; pointIndex++) {
        const distance = road[pointIndex].distanceTo(target);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = pointIndex;
        }
        if (bestDistance < 25 && distance > bestDistance + 40) break;
      }

      connected.push(...road.slice(cursor, bestIndex + 1));
      const roadPoint = road[bestIndex];
      const previous = connected[connected.length - 1];
      if (roadPoint.distanceTo(anchor) > 2 && (!previous || previous.distanceTo(anchor) > 2)) {
        connected.push(anchor, roadPoint);
      }
      cursor = bestIndex;
    });

    connected.push(...road.slice(cursor));
    return connected;
  }
}
