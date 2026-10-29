import {
  AfterViewInit,
  Component,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { CustomerService } from '../../services/customer.service';
import { Customer, CreateCustomerDto } from '../../models/customer.model';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css',
})
export class CustomerManagement implements OnInit, AfterViewInit, OnDestroy {
  private readonly customerService = inject(CustomerService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly shop = environment.shop;
  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly deletingId = signal<string | number | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly editingId = signal<string | number | null>(null);
  readonly isFormOpen = signal(false);
  readonly appliedSearch = signal('');
  readonly appliedRadius = signal<number | null>(null);
  readonly isBusy = computed(
    () => this.isLoading() || this.isSaving() || this.deletingId() !== null,
  );

  searchKeyword = '';
  radiusKm: number | null = 1;
  formData = this.emptyForm();

  private map?: L.Map;
  private resizeObserver?: ResizeObserver;
  private readonly markersLayer = L.layerGroup();
  private readonly markerMap = new Map<string | number, L.Marker>();
  private pickerMap?: L.Map;
  private pickerMarker?: L.Marker;
  private pickerResizeObserver?: ResizeObserver;
  @ViewChild('customerDialog', { static: true }) private dialog?: ElementRef<HTMLDialogElement>;

  @ViewChild('pickerMap')
  set pickerMapElement(element: ElementRef<HTMLDivElement> | undefined) {
    this.destroyPickerMap();
    if (!element) return;
    this.pickerMap = L.map(element.nativeElement).setView(
      [this.formData.latitude ?? this.shop.lat, this.formData.longitude ?? this.shop.lng],
      16,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.pickerMap);
    this.pickerMap.on('click', (event: L.LeafletMouseEvent) => {
      if (this.isSaving()) return;
      this.formData.latitude = Number(event.latlng.lat.toFixed(6));
      this.formData.longitude = Number(event.latlng.lng.toFixed(6));
      this.updatePicker(false);
      this.changeDetector.markForCheck();
    });
    this.addShopMarker(this.pickerMap);
    this.updatePicker(false);
    this.pickerMap.fitBounds(
      [
        [this.shop.lat, this.shop.lng],
        [this.formData.latitude ?? this.shop.lat, this.formData.longitude ?? this.shop.lng],
      ],
      { padding: [45, 45], maxZoom: 16 },
    );
    this.pickerResizeObserver = new ResizeObserver(() =>
      this.pickerMap?.invalidateSize({ pan: false }),
    );
    this.pickerResizeObserver.observe(element.nativeElement);
    document.getElementById('customer-name')?.focus();
  }
  private radiusCircle?: L.Circle;
  private requestId = 0;

  ngOnInit(): void {
    void this.loadDataAsync();
  }

  ngAfterViewInit(): void {
    const point: L.LatLngTuple = [this.shop.lat, this.shop.lng];
    this.map = L.map('main-customer-map').setView(point, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.markersLayer.addTo(this.map);
    this.addShopMarker(this.map);
    const element = document.getElementById('main-customer-map')!;
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.resizeObserver.observe(element);
    this.renderCustomerMarkers();
    this.renderRadius();
  }

  ngOnDestroy(): void {
    this.requestId++;
    this.destroyPickerMap();
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = undefined;
  }

  formatCustomerId(id: number | string): string {
    return /^\d+$/.test(String(id)) ? `CUST-${String(id).padStart(3, '0')}` : String(id);
  }

  async onSearch(): Promise<void> {
    this.appliedSearch.set(this.searchKeyword.trim());
    await this.loadDataAsync();
  }

  async onFilterNearby(): Promise<void> {
    const km = Number(this.radiusKm);
    if (!Number.isFinite(km) || km <= 0 || km > 3) {
      this.loadError.set('กรุณาระบุรัศมีมากกว่า 0 และไม่เกิน 3 กิโลเมตร');
      return;
    }
    this.appliedRadius.set(km);
    await this.loadDataAsync();
  }

  async resetFilters(): Promise<void> {
    this.searchKeyword = '';
    this.radiusKm = 1;
    this.appliedSearch.set('');
    this.appliedRadius.set(null);
    await this.loadDataAsync();
  }

  async loadDataAsync(): Promise<boolean> {
    const request = ++this.requestId;
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const keyword = this.appliedSearch();
      const km = this.appliedRadius();
      let data: Customer[];
      if (keyword && km !== null) {
        const [matching, nearby] = await Promise.all([
          this.customerService.searchCustomers(keyword),
          this.customerService.getNearbyCustomers(km),
        ]);
        const matchingIds = new Set(matching.map((customer) => String(customer.id)));
        data = nearby.filter((customer) => matchingIds.has(String(customer.id)));
      } else if (km !== null) {
        data = await this.customerService.getNearbyCustomers(km);
      } else if (keyword) {
        data = await this.customerService.searchCustomers(keyword);
      } else {
        data = await this.customerService.getCustomers();
      }
      if (request !== this.requestId) return false;
      this.customers.set(data);
      this.renderCustomerMarkers();
      this.renderRadius();
      return true;
    } catch (error: unknown) {
      if (request === this.requestId) {
        this.loadError.set(this.getRequestErrorMessage(error));
        // ไม่แสดงผลชุดเก่าเป็นผลของตัวกรองใหม่เมื่อโหลดไม่สำเร็จ
        this.customers.set([]);
        this.renderCustomerMarkers();
        this.radiusCircle?.remove();
        this.radiusCircle = undefined;
      }
      return false;
    } finally {
      if (request === this.requestId) this.isLoading.set(false);
    }
  }

  openAddForm(): void {
    if (this.isBusy()) return;
    this.resetForm();
    this.feedback.set(null);
    this.isFormOpen.set(true);
    this.dialog?.nativeElement.showModal();
  }

  closeForm(): void {
    if (this.isSaving()) return;
    this.dismissForm();
  }

  private dismissForm(): void {
    this.dialog?.nativeElement.close();
    this.isFormOpen.set(false);
    this.destroyPickerMap();
    this.resetForm();
  }

  private destroyPickerMap(): void {
    this.pickerResizeObserver?.disconnect();
    this.pickerResizeObserver = undefined;
    this.pickerMap?.remove();
    this.pickerMap = undefined;
    this.pickerMarker = undefined;
  }

  resetForm(): void {
    this.editingId.set(null);
    this.formData = this.emptyForm();
    this.formError.set(null);
    this.pickerMarker?.remove();
    this.pickerMarker = undefined;
    if (this.isFormOpen()) this.updatePicker();
  }

  editCustomer(customer: Customer): void {
    this.editingId.set(customer.id);
    this.formError.set(null);
    this.feedback.set(null);
    this.formData = {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      latitude: Number(customer.latitude),
      longitude: Number(customer.longitude),
    };
    this.isFormOpen.set(true);
    this.dialog?.nativeElement.showModal();
  }

  updatePicker(panToMarker = true): void {
    if (!this.pickerMap) return;
    const lat = this.formData.latitude;
    const lng = this.formData.longitude;
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    )
      return;
    if (this.pickerMarker) {
      this.pickerMarker.setLatLng([lat, lng]);
    } else {
      this.pickerMarker = L.marker([lat, lng], {
        draggable: true,
        zIndexOffset: 1000,
        title: 'ลากหมุดเพื่อเลือกตำแหน่งลูกค้า',
        icon: L.divIcon({
          className: 'customer-picker-pin',
          html: '<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44C15 39 2 26 2 18a16 16 0 1 1 32 0c0 8-13 21-16 26Z" fill="#ea580c" stroke="white" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="white"/></svg>',
          iconSize: [36, 46],
          iconAnchor: [18, 44],
        }),
      }).addTo(this.pickerMap);
      this.pickerMarker.on('dragend', () => {
        if (this.isSaving()) {
          this.updatePicker();
          return;
        }
        const position = this.pickerMarker!.getLatLng();
        this.formData.latitude = Number(position.lat.toFixed(6));
        this.formData.longitude = Number(position.lng.toFixed(6));
        this.changeDetector.markForCheck();
      });
    }
    if (panToMarker && !this.pickerMap.getBounds().contains([lat, lng])) {
      this.pickerMap.panTo([lat, lng]);
    }
  }

  focusCustomerOnMap(customer: Customer): void {
    this.map?.flyTo([Number(customer.latitude), Number(customer.longitude)], 16);
    this.markerMap.get(customer.id)?.openPopup();
  }

  async saveCustomer(): Promise<void> {
    if (this.isBusy()) return;
    this.formError.set(null);
    this.feedback.set(null);
    if (
      !this.formData.name.trim() ||
      !this.formData.phone.trim() ||
      !this.formData.address.trim()
    ) {
      this.formError.set('กรุณากรอกชื่อ เบอร์โทร และที่อยู่ / จุดสังเกตให้ครบถ้วน');
      return;
    }
    const { latitude, longitude } = this.formData;
    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      this.formError.set('กรุณาระบุพิกัดละติจูดและลองจิจูดที่ถูกต้อง');
      return;
    }
    this.isSaving.set(true);
    try {
      const dto: CreateCustomerDto = { ...this.formData, latitude, longitude };
      const id = this.editingId();
      if (id !== null) await this.customerService.updateCustomer(id, dto);
      else await this.customerService.createCustomer(dto);
      this.dismissForm();
      const refreshed = await this.loadDataAsync();
      this.feedback.set(
        refreshed
          ? 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว'
          : 'บันทึกข้อมูลแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ กรุณากดลองโหลดใหม่',
      );
    } catch (error: unknown) {
      this.formError.set(this.getRequestErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    if (
      this.isBusy() ||
      !confirm(`ยืนยันลบ ${this.formatCustomerId(customer.id)}: ${customer.name}?`)
    )
      return;
    this.deletingId.set(customer.id);
    this.feedback.set(null);
    try {
      await this.customerService.deleteCustomer(customer.id);
      if (this.editingId() === customer.id) this.resetForm();
      const refreshed = await this.loadDataAsync();
      this.feedback.set(
        refreshed ? 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว' : 'ลบข้อมูลแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ',
      );
    } catch (error: unknown) {
      this.feedback.set(null);
      this.loadError.set(this.getRequestErrorMessage(error, true));
    } finally {
      this.deletingId.set(null);
    }
  }

  private emptyForm(): Omit<CreateCustomerDto, 'latitude' | 'longitude'> & {
    latitude: number | null;
    longitude: number | null;
  } {
    return {
      name: '',
      phone: '',
      address: '',
      latitude: environment.shop.lat,
      longitude: environment.shop.lng,
    };
  }

  private addShopMarker(map: L.Map): void {
    L.marker([this.shop.lat, this.shop.lng], {
      title: this.shop.name,
      icon: L.divIcon({
        className: 'customer-shop-pin',
        html: '<span>🍱 ร้านป้าติ๋ม</span>',
        iconSize: [124, 32],
        // วางป้ายข้างจุดร้าน เพื่อให้เห็นทั้งร้านและหมุดบ้านเมื่อพิกัดตรงกัน
        iconAnchor: [-12, 16],
      }),
    })
      .bindPopup('ร้านป้าติ๋ม · คณะวิทยาการสารสนเทศ มมส.')
      .addTo(map);
  }

  private renderCustomerMarkers(): void {
    if (!this.map) return;
    this.markersLayer.clearLayers();
    this.markerMap.clear();
    const icon = L.divIcon({
      className: 'customer-home-pin',
      html: '<span>⌂</span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    for (const customer of this.customers()) {
      // ใช้ textContent เพื่อไม่ให้ชื่อหรือที่อยู่ถูกตีความเป็น HTML ใน Leaflet popup
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${this.formatCustomerId(customer.id)}: ${customer.name}`;
      const phone = document.createElement('div');
      phone.textContent = `โทร: ${customer.phone}`;
      const address = document.createElement('div');
      address.textContent = customer.address;
      popup.append(title, phone, address);
      const marker = L.marker([Number(customer.latitude), Number(customer.longitude)], { icon })
        .bindPopup(popup)
        .addTo(this.markersLayer);
      this.markerMap.set(customer.id, marker);
    }
  }

  private renderRadius(): void {
    this.radiusCircle?.remove();
    this.radiusCircle = undefined;
    const km = this.appliedRadius();
    if (!this.map || km === null) return;
    this.radiusCircle = L.circle([this.shop.lat, this.shop.lng], {
      radius: km * 1000,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
    }).addTo(this.map);
    this.map.fitBounds(this.radiusCircle.getBounds());
  }

  private getRequestErrorMessage(error: unknown, deleting = false): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      const body = error.error;
      const message =
        typeof body?.error === 'string'
          ? body.error
          : typeof body?.message === 'string'
            ? body.message
            : '';
      if (deleting && (error.status === 409 || /foreign key|constraint|ออเดอร์/i.test(message))) {
        return 'ไม่สามารถลบลูกค้าที่มีออเดอร์อ้างอิงอยู่ได้ กรุณาจัดการออเดอร์ที่เกี่ยวข้องก่อน';
      }
      return message || `ดำเนินการไม่สำเร็จ (HTTP ${error.status}) กรุณาลองใหม่อีกครั้ง`;
    }
    return error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }
}
