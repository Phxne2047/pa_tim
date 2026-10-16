import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { OrderService, DbOrder } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';
import { OrderItem } from '../../models/order.model';

export type { OrderItem };


@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
})
export class OrderManagement implements OnInit, AfterViewInit, OnDestroy {
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);
  private router = inject(Router);

  // Connection & loading state
  isLoading = signal<boolean>(false);
  isConnectedToDb = signal<boolean>(true);

  // Search filter
  searchQuery = signal<string>('');

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastTimeout: any = null;

  // Modals state
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  selectedOrder = signal<OrderItem | null>(null);

  // Form Model for Add/Edit
  formData: {
    rawId?: number | string;
    id?: string;
    customer_id?: number | string;
    name: string;
    phone: string;
    address: string;
    menu: string;
    boxes: number;
    lat: number;
    lng: number;
  } = {
      name: '',
      phone: '',
      address: '',
      menu: 'ข้าวกะเพราหมูกรอบไข่ดาว',
      boxes: 2,
      lat: 16.246839,
      lng: 103.251963,
    };

  // Popular MSU lunch menu list
  menuList = [
    'ข้าวผัดต้มยำทะเล',
    'ข้าวหมูทอดน้ำปลา',
    'ข้าวพริกแกงหมูกรอบ',
    'กะเพราหมูกรอบไข่ดาว',
    'ข้าวผัดอเมริกัน',
    'ข้าวกะเพราหมูสับไข่เค็ม',
    'ข้าวผัดต้มยำกุ้ง',
    'ข้าวผัดกุนเชียงใส่ไข่',
    'ข้าวไข่เจียวหมูกรอบ',
    'ข้าวหมูกระเทียมไข่ดาว',
    'ข้าวคะน้าหมูกรอบ',
    'ข้าวกะเพราไข่เยี่ยวม้าหมูสับ',
    'ข้าวพริกเผาหมูกรอบ',
  ];

  // Customers master pool in MSU Kham Riang & Tha Khon Yang area
  customerPool = signal<any[]>([
    { id: 1, name: 'คุณพงศกร ใจกล้า', phone: '093-778-8990', address: 'คณะวิทยาศาสตร์ อาคาร SC2', lat: 16.2448, lng: 103.2505 },
    { id: 2, name: 'คุณลลิตา มีสุข', phone: '094-889-9001', address: 'หอพักภูตะวัน ท่าขอนยาง', lat: 16.2492, lng: 103.2541 },
    { id: 3, name: 'คุณเมธัส วัฒนวงศ์', phone: '091-556-6778', address: 'สำนักวิทยบริการ (หอสมุดกลาง)', lat: 16.2452, lng: 103.2518 },
    { id: 4, name: 'อ.ดร.วิภาดา รัตนกุล', phone: '086-333-4455', address: 'คณะวิทยาการสารสนเทศ ชั้น 3 ห้อง 305', lat: 16.2468, lng: 103.252 },
    { id: 5, name: 'คุณภาณุวัฒน์ ศรีสมร', phone: '084-888-9900', address: 'หอพักอินเตอร์ ขามเรียง', lat: 16.2435, lng: 103.2361 },
    { id: 6, name: 'คุณธนดล ศรีสุวรรณ', phone: '082-556-6778', address: 'คณะการท่องเที่ยวและการโรงแรม', lat: 16.2445, lng: 103.253 },
    { id: 7, name: 'คุณสุพรรณษา สุวรรณฉัตร', phone: '089-123-4567', address: 'หอพักขวัญมอ ซอย 3', lat: 16.2485, lng: 103.2532 },
    { id: 8, name: 'คุณชานนท์ วัฒนพงษ์', phone: '088-888-9900', address: 'หอพักเดอะกู๊ดรูม ซอยลีลา', lat: 16.252, lng: 103.2509 },
    { id: 9, name: 'คุณอภิสิทธิ์ ทองแท้', phone: '088-901-2345', address: 'ศูนย์บริการทางการแพทย์ มมส.', lat: 16.2502, lng: 103.247 },
    { id: 10, name: 'คุณปานวาด รัตนดิลก', phone: '085-678-9012', address: 'หอพักไอคอนคอนโด', lat: 16.2542, lng: 103.2528 },
    { id: 11, name: 'คุณธนาภรณ์ บุญเลิศ', phone: '089-999-0011', address: 'หอพักเคหะมอ หน้าป้าย มมส.', lat: 16.2421, lng: 103.2525 },
    { id: 12, name: 'คุณภูมิพัฒน์ ชัยชนะ', phone: '084-567-8901', address: 'หอพักดวงกมล ซอยเกิ้ง', lat: 16.2408, lng: 103.2511 },
    { id: 13, name: 'คุณกิตติศักดิ์ ศรีเมือง', phone: '082-345-6789', address: 'ตลาดน้อย มมส.', lat: 16.2459, lng: 103.2548 },
    { id: 14, name: 'คุณชญานิศ สิงห์ทอง', phone: '087-890-1234', address: 'หอพักริมมอ 2 มมส.', lat: 16.2415, lng: 103.2575 },
    { id: 15, name: 'คุณวรดร สุขสมบูรณ์', phone: '086-789-0123', address: 'คณะมนุษยศาสตร์และสังคมศาสตร์', lat: 16.2488, lng: 103.256 },
    { id: 16, name: 'คุณพิชญ์ชานันท์ พรหมดี', phone: '081-234-5678', address: 'หอพักศรีสมเด็จ ซอย 5', lat: 16.2535, lng: 103.2541 },
    { id: 17, name: 'คุณศศิธร ทรัพย์มาก', phone: '082-435-7689', address: 'อาคารพลศึกษา มมส.', lat: 16.2462, lng: 103.2465 },
    { id: 18, name: 'คุณจิรายุ ภักดีชน', phone: '081-324-6578', address: 'หอพักบัณฑิตโฮม มมส.', lat: 16.255, lng: 103.2515 },
    { id: 19, name: 'คุณฐิติมา วิมลสุข', phone: '089-012-3456', address: 'หอพักเพชรไพลิน ประตู 2', lat: 16.243, lng: 103.248 },
    { id: 20, name: 'คุณนภัสสร รัตนเดช', phone: '087-777-8899', address: 'คณะพยาบาลศาสตร์ มมส.', lat: 16.2491, lng: 103.2482 },
    { id: 21, name: 'คุณวรัญญา สิทธิโชค', phone: '086-666-7788', address: 'หอพักบ้านสวนปาล์ม ซอยสุขุมวิท', lat: 16.2435, lng: 103.2562 },
    { id: 22, name: 'คุณอรวรรณ แก้วใส', phone: '084-444-5566', address: 'คณะวิศวกรรมศาสตร์ มมส.', lat: 16.2441, lng: 103.2495 },
    { id: 23, name: 'คุณปฏิภาณ วงศ์สว่าง', phone: '085-555-6677', address: 'คอนโดเดอะแคปิตอล มมส.', lat: 16.2512, lng: 103.2558 },
    { id: 24, name: 'คุณสุชาดา อินทรชัย', phone: '083-456-7890', address: 'อาคารพัฒนานิสิต มมส.', lat: 16.2475, lng: 103.2505 },
    { id: 25, name: 'คุณนพรัตน์ แสนสุข', phone: '083-678-9014', address: 'สำนักคอมพิวเตอร์ มมส.', lat: 16.2455, lng: 103.2522 },
    { id: 26, name: 'คุณกัญญาพัชร สร้อยทอง', phone: '089-765-4321', address: 'หอพักศิริพร ห้อง 101 ท่าขอนยาง', lat: 16.2475, lng: 103.251 },
    { id: 27, name: 'คุณธีรศักดิ์ โกศล', phone: '081-987-6543', address: 'คณะเภสัชศาสตร์ มมส.', lat: 16.2498, lng: 103.249 },
    { id: 28, name: 'คุณพิมพ์ชนก บุญมี', phone: '084-123-9876', address: 'หอพักพฤกษาโฮม ท่าขอนยาง', lat: 16.2505, lng: 103.255 },
    { id: 29, name: 'คุณชาคริต แสงดาว', phone: '085-321-4567', address: 'คณะสถาปัตยกรรมศาสตร์ มมส.', lat: 16.2438, lng: 103.2515 },
  ]);

  // Reactive orders state
  orders = signal<OrderItem[]>([]);

  // Computed totals
  totalBoxes = computed(() => {
    return this.orders().reduce((acc, curr) => acc + curr.boxes, 0);
  });

  filteredOrders = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.orders();
    return this.orders().filter(o =>
      o.id.toLowerCase().includes(query) ||
      o.name.toLowerCase().includes(query) ||
      o.phone.toLowerCase().includes(query) ||
      o.address.toLowerCase().includes(query) ||
      o.menu.toLowerCase().includes(query)
    );
  });

  // Helper to check if a customer already has an order in the current orders list
  isCustomerOrdered(cust: any): boolean {
    if (!cust) return false;
    return this.orders().some(o => {
      const matchId = cust.id != null && o.customer_id != null && String(cust.id) === String(o.customer_id);
      const matchName = cust.name && o.name && cust.name.trim().toLowerCase() === o.name.trim().toLowerCase();
      return matchId || matchName;
    });
  }

  // Available customers who DO NOT have an order yet
  availableCustomers = computed(() => {
    return this.customerPool().filter(c => !this.isCustomerOrdered(c));
  });

  // Customers who already have an active order
  orderedCustomers = computed(() => {
    return this.customerPool().filter(c => this.isCustomerOrdered(c));
  });

  // Leaflet map instance & markers
  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  ngOnInit(): void {
    this.fetchCustomersFromDb();
    this.fetchOrdersFromDb();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Fetch customer master list from live database
   */
  /**
 * Fetch customer master list from live database
 */
  async fetchCustomersFromDb(): Promise<void> {
    try {
      const data = await this.customerService.getCustomers();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          lat: parseFloat(c.latitude as any) || 16.246839,
          lng: parseFloat(c.longitude as any) || 103.251963,
        }));
        this.customerPool.set(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch customers from DB, using internal customer pool:', err);
    }
  }


  /**
   * Fetch orders live from Database API
   */
  fetchOrdersFromDb(): void {
    this.isLoading.set(true);
    this.orderService.getOrders().subscribe({
      next: (dbOrders: DbOrder[]) => {
        this.isLoading.set(false);
        this.isConnectedToDb.set(true);

        if (Array.isArray(dbOrders) && dbOrders.length > 0) {
          const mapped: OrderItem[] = dbOrders.map((o, idx) => {
            const rawIdNum = typeof o.id === 'number' ? o.id : parseInt(o.id, 10);
            const displayId = isNaN(rawIdNum) ? `ORD-${o.id}` : `ORD-${100 + (idx + 1)}`;

            let timeStr = '10:00 น.';
            if (o.created_at) {
              const d = new Date(o.created_at);
              if (!isNaN(d.getTime())) {
                const h = d.getHours();
                const m = d.getMinutes();
                timeStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m} น.`;
              }
            }

            return {
              rawId: o.id,
              id: displayId,
              customer_id: o.customer_id,
              name: o.name || o.customer_name || 'ลูกค้า',
              phone: o.phone || o.customer_phone || '08X-XXX-XXXX',
              address: o.address || o.customer_address || 'ม.มหาสารคาม',
              menu: o.menu || 'ข้าวกะเพราหมูกรอบ',
              boxes: Number(o.boxes) || 1,
              time: timeStr,
              lat: parseFloat((o.latitude ?? 16.246839) as string),
              lng: parseFloat((o.longitude ?? 103.251963) as string),
              created_at: o.created_at,
            };
          });

          this.orders.set(mapped);
          this.saveOrdersToLocal(mapped);
          this.renderMarkers();
          return;
        }

        // If empty DB, generate initial local orders
        this.fallbackLocalSimulation(25);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isConnectedToDb.set(false);
        console.warn('Backend unavailable, switching to local mode:', err);
        this.loadOrdersFromLocalStorageFallback();
      }
    });
  }

  saveOrdersToLocal(ordersList: OrderItem[]): void {
    localStorage.setItem('pa_tim_orders', JSON.stringify(ordersList));
  }

  /**
   * LocalStorage Fallback
   */
  loadOrdersFromLocalStorageFallback(): void {
    const saved = localStorage.getItem('pa_tim_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orders.set(parsed);
          this.renderMarkers();
          return;
        }
      } catch (e) {
        console.error('Failed to parse local orders:', e);
      }
    }
    this.fallbackLocalSimulation(29);
  }

  /**
   * Initialize Leaflet Map
   */
  private initMap(): void {
    const mapElement = document.getElementById('order-map');
    if (!mapElement) return;

    const shopLat = environment.shop?.lat || 16.246839;
    const shopLng = environment.shop?.lng || 103.251963;

    this.map = L.map('order-map', {
      zoomControl: true,
      attributionControl: true,
    }).setView([shopLat, shopLng], 14.5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Leaflet | &copy; OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  /**
   * Render custom circular markers on the Leaflet map
   */
  renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const ordersToRender = this.filteredOrders();
    const bounds = L.latLngBounds([]);

    // Add Shop Marker
    const shopLat = environment.shop?.lat || 16.246839;
    const shopLng = environment.shop?.lng || 103.251963;
    const shopIcon = L.divIcon({
      className: 'leaflet-order-marker marker-shop',
      html: `<span style="font-size: 15px;">🍱</span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });

    const shopMarker = L.marker([shopLat, shopLng], { icon: shopIcon })
      .bindPopup(`
        <div class="p-1">
          <p class="font-bold text-sm text-purple-800">🏠 ร้านป้าติ๋ม (จุดปล่อยอาหาร)</p>
          <p class="text-xs text-slate-600 mt-1">คณะวิทยาการสารสนเทศ มมส.</p>
          <p class="text-xs text-slate-500">โทร: 081-795-8189</p>
        </div>
      `, { className: 'custom-leaflet-popup' });
    this.markersLayer.addLayer(shopMarker);
    bounds.extend([shopLat, shopLng]);

    ordersToRender.forEach(order => {
      const markerClass = order.boxes === 1
        ? 'marker-boxes-1'
        : order.boxes === 2
          ? 'marker-boxes-2'
          : 'marker-boxes-3';

      const customIcon = L.divIcon({
        className: `leaflet-order-marker ${markerClass}`,
        html: `<span>${order.boxes}ก</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      });

      const badgeColor = order.boxes === 1
        ? 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
        : order.boxes === 2
          ? 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;'
          : 'background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;';

      const popupContent = `
        <div class="text-left font-sans">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <strong style="color: #0f172a; font-size: 13px;">${order.id}</strong>
            <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; ${badgeColor}">
              ${order.boxes} กล่อง (฿${order.boxes * 65})
            </span>
          </div>
          <div style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 2px;">${order.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">📞 ${order.phone}</div>
          <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">📍 ${order.address}</div>
          <div style="font-size: 12px; color: #d97706; font-weight: 500; margin-bottom: 4px;">🍱 ${order.menu}</div>
          <div style="font-size: 11px; color: #94a3b8;">🕒 สั่งเมื่อ: ${order.time}</div>
        </div>
      `;

      const marker = L.marker([order.lat, order.lng], { icon: customIcon })
        .bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      this.markersLayer!.addLayer(marker);
      bounds.extend([order.lat, order.lng]);
    });

    if (ordersToRender.length > 0 && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15.5 });
    }
  }

  /**
   * Random simulation of 20-30 orders via Database API with seamless fallback
   */
  simulateRandomOrders(): void {
    this.isLoading.set(true);
    this.showToast('⏳ กำลังสุ่มออเดอร์ใหม่...');

    this.orderService.simulateOrders(25, true).subscribe({
      next: (res) => {
        this.fetchOrdersFromDb();
        this.showToast(`🎲 สุ่มออเดอร์ใหม่ลง Database เรียบร้อยแล้ว (${res.count || 25} รายการ)`);
      },
      error: (err) => {
        console.warn('DB simulation failed, executing local simulation fallback:', err);
        this.fallbackLocalSimulation(Math.floor(Math.random() * 11) + 20);
      }
    });
  }

  /**
   * Fallback local simulation
   */
  fallbackLocalSimulation(count: number): void {
    this.isLoading.set(false);
    const shuffled = [...this.customerPool()].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    const newOrders: OrderItem[] = selected.map((cust, idx) => {
      const boxes = Math.floor(Math.random() * 3) + 1;
      const menu = this.menuList[Math.floor(Math.random() * this.menuList.length)];
      const minutes = Math.floor(Math.random() * 30);
      const timeStr = `10:${minutes < 10 ? '0' : ''}${minutes} น.`;

      const jitterLat = (Math.random() - 0.5) * 0.002;
      const jitterLng = (Math.random() - 0.5) * 0.002;

      return {
        rawId: 101 + idx,
        id: `ORD-${101 + idx}`,
        customer_id: cust.id,
        name: cust.name,
        phone: cust.phone,
        address: cust.address,
        menu,
        boxes,
        time: timeStr,
        lat: cust.lat + jitterLat,
        lng: cust.lng + jitterLng,
      };
    });

    this.orders.set(newOrders);
    this.saveOrdersToLocal(newOrders);
    this.renderMarkers();
    this.showToast(`🎲 สุ่มออเดอร์ใหม่สำเร็จ ${newOrders.length} รายการ (รวม ${this.totalBoxes()} กล่อง)`);
  }

  /**
   * Search handler
   */
  onSearchChange(): void {
    this.renderMarkers();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.renderMarkers();
  }

  /**
   * Open Add Order Modal
   */
  openAddModal(): void {
    const nextId = `ORD-${101 + this.orders().length}`;
    const available = this.availableCustomers();
    const defaultCust = (available.length > 0 ? available[0] : this.customerPool()[0]) || {
      id: 1,
      name: 'คุณพงศกร ใจกล้า',
      phone: '093-778-8990',
      address: 'คณะวิทยาศาสตร์ SC2',
      lat: 16.2448,
      lng: 103.2505
    };

    this.formData = {
      id: nextId,
      customer_id: defaultCust.id,
      name: defaultCust.name,
      phone: defaultCust.phone,
      address: defaultCust.address,
      menu: this.menuList[0],
      boxes: 1,
      lat: defaultCust.lat,
      lng: defaultCust.lng,
    };
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  selectCustomerPreset(cust: any): void {
    this.formData.customer_id = cust.id;
    this.formData.name = cust.name;
    this.formData.phone = cust.phone;
    this.formData.address = cust.address;
    this.formData.lat = cust.lat;
    this.formData.lng = cust.lng;
  }

  /**
   * Handle customer dropdown selection
   */
  onCustomerChange(customerId: any): void {
    const cid = Number(customerId);
    const selected = this.customerPool().find(c => c.id === cid || c.id === customerId);
    if (selected) {
      this.formData.customer_id = selected.id;
      this.formData.name = selected.name;
      this.formData.phone = selected.phone;
      this.formData.address = selected.address;
      this.formData.lat = selected.lat;
      this.formData.lng = selected.lng;
    }
  }

  /**
   * Save newly created order to Database POST /orders (with fallback)
   */
  saveNewOrder(): void {
    if (!this.formData.name || !this.formData.address) {
      this.showToast('⚠️ กรุณาเลือกลูกค้าและสถานที่จัดส่ง');
      return;
    }

    if (this.isCustomerOrdered({ id: this.formData.customer_id, name: this.formData.name })) {
      this.showToast('⚠️ ลูกค้ารายนี้มีออเดอร์ในระบบแล้ว ไม่สามารถเพิ่มซ้ำได้');
      return;
    }

    const payload = {
      customer_id: this.formData.customer_id || 1,
      boxes: Number(this.formData.boxes) || 1,
      menu: this.formData.menu || 'ข้าวกะเพราหมูสับไข่ดาว',
      status: 'pending'
    };

    this.isLoading.set(true);
    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.closeAddModal();
        this.fetchOrdersFromDb();
        this.showToast('✅ บันทึกออเดอร์ใหม่ลง Database สำเร็จ');
      },
      error: () => {
        // Local fallback
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()} น.`;
        const newOrder: OrderItem = {
          rawId: Date.now(),
          id: this.formData.id || `ORD-${101 + this.orders().length}`,
          name: this.formData.name,
          phone: this.formData.phone || '081-000-0000',
          address: this.formData.address,
          menu: this.formData.menu,
          boxes: Number(this.formData.boxes) || 1,
          time: timeStr,
          lat: this.formData.lat,
          lng: this.formData.lng,
        };
        const updated = [newOrder, ...this.orders()];
        this.orders.set(updated);
        this.saveOrdersToLocal(updated);
        this.closeAddModal();
        this.renderMarkers();
        this.isLoading.set(false);
        this.showToast(`เพิ่มออเดอร์ ${newOrder.id} เรียบร้อยแล้ว`);
      }
    });
  }

  /**
   * Open Edit Order Modal
   */
  openEditModal(order: OrderItem): void {
    this.selectedOrder.set(order);
    this.formData = {
      rawId: order.rawId,
      id: order.id,
      customer_id: order.customer_id,
      name: order.name,
      phone: order.phone,
      address: order.address,
      menu: order.menu,
      boxes: order.boxes,
      lat: order.lat,
      lng: order.lng,
    };
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedOrder.set(null);
  }

  /**
   * Save edited order to Database PATCH /orders/:id (with fallback)
   */
  saveEditedOrder(): void {
    const cur = this.selectedOrder();
    if (!cur) return;

    this.isLoading.set(true);
    this.orderService.patchOrder(cur.rawId, {
      boxes: Number(this.formData.boxes),
      menu: this.formData.menu
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.fetchOrdersFromDb();
        this.showToast(`✅ อัปเดตข้อมูล ${cur.id} ใน Database สำเร็จ`);
      },
      error: () => {
        // Local fallback (อัปเดตเฉพาะเมนูและจำนวนกล่อง)
        const updated = this.orders().map(o => {
          if (o.id === cur.id) {
            return {
              ...o,
              menu: this.formData.menu,
              boxes: Number(this.formData.boxes),
            };
          }
          return o;
        });
        this.orders.set(updated);
        this.saveOrdersToLocal(updated);
        this.closeEditModal();
        this.renderMarkers();
        this.isLoading.set(false);
        this.showToast(`บันทึกการแก้ไข ${cur.id} เรียบร้อย`);
      }
    });
  }

  /**
   * Delete order from Database DELETE /orders/:id (with fallback)
   */
  deleteOrder(order: OrderItem): void {
    if (confirm(`คุณต้องการลบออเดอร์ ${order.id} (${order.name}) ใช่หรือไม่?`)) {
      this.isLoading.set(true);
      this.orderService.deleteOrder(order.rawId).subscribe({
        next: () => {
          this.fetchOrdersFromDb();
          this.showToast(`🗑️ ลบออเดอร์ ${order.id} จาก Database สำเร็จ`);
        },
        error: () => {
          const updated = this.orders().filter(o => o.id !== order.id);
          this.orders.set(updated);
          this.saveOrdersToLocal(updated);
          this.renderMarkers();
          this.isLoading.set(false);
          this.showToast(`ลบออเดอร์ ${order.id} แล้ว`);
        }
      });
    }
  }

  /**
   * Navigate to route calculation
   */
  goToRouteCalculation(): void {
    this.showToast('🚀 กำลังนำทางไปหน้าคำนวณเส้นทางจัดส่ง...');
    setTimeout(() => {
      this.router.navigate(['/route-dashboard']).catch(() => {
        alert('ระบบพร้อมส่งต่อข้อมูลออเดอร์ทั้ง ' + this.orders().length + ' จุด ไปยังโมดูลจัดเส้นทาง (Route Dashboard)');
      });
    }, 400);
  }

  /**
   * Toast helper
   */
  showToast(msg: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(msg);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }
}
