import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom, timeout } from 'rxjs';
import { Api } from '../config/api';
import { Customer, CreateCustomerDto } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);
  private readonly apiUrl = `${this.api.API_ENDPOINT.replace(/\/+$/, '')}/customers`;

  getCustomers(): Promise<Customer[]> {
    return this.getList(this.apiUrl);
  }

  async searchCustomers(keyword: string): Promise<Customer[]> {
    const term = keyword.trim();
    if (!term) return this.getCustomers();
    // API /search รองรับชื่อเท่านั้น จึงจับคู่รหัสจากรายการจริงที่เซิร์ฟเวอร์ส่งกลับ
    const id = /^(?:CUST-)?(\d+)$/i.exec(term);
    if (id) {
      const customers = await this.getCustomers();
      return customers.filter((customer) => {
        const customerId = /^(?:CUST-)?(\d+)$/i.exec(String(customer.id));
        return customerId !== null && Number(customerId[1]) === Number(id[1]);
      });
    }
    return this.getList(`${this.apiUrl}/search`, new HttpParams().set('name', term));
  }

  getNearbyCustomers(km: number = 1): Promise<Customer[]> {
    if (!Number.isFinite(km) || km <= 0) {
      return Promise.reject(new Error('กรุณาระบุรัศมีมากกว่า 0 กิโลเมตร'));
    }
    return this.getList(`${this.apiUrl}/near`, new HttpParams().set('km', String(km)));
  }

  createCustomer(dto: CreateCustomerDto): Promise<unknown> {
    return lastValueFrom(this.http.post(this.apiUrl, this.toPayload(dto)));
  }

  updateCustomer(id: number | string, dto: CreateCustomerDto): Promise<unknown> {
    return lastValueFrom(
      this.http.put(`${this.apiUrl}/${encodeURIComponent(id)}`, this.toPayload(dto)),
    );
  }

  deleteCustomer(id: number | string): Promise<unknown> {
    return lastValueFrom(this.http.delete(`${this.apiUrl}/${encodeURIComponent(id)}`));
  }

  private async getList(url: string, params = new HttpParams()): Promise<Customer[]> {
    const response: unknown = await lastValueFrom(
      this.http.get<unknown>(url, { params }).pipe(timeout(15_000)),
    );
    const list = Array.isArray(response)
      ? response
      : this.isRecord(response) && Array.isArray(response['data'])
        ? response['data']
        : null;
    if (!list) throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง: ต้องได้รับรายการลูกค้า');
    return list.map((customer) => this.normalizeCustomer(customer));
  }

  private toPayload(dto: CreateCustomerDto): CreateCustomerDto {
    const latitude = this.parseCoordinate(dto.latitude, 'ละติจูด', 90);
    const longitude = this.parseCoordinate(dto.longitude, 'ลองจิจูด', 180);
    if (!dto.name.trim() || !dto.phone.trim() || !dto.address.trim()) {
      throw new Error('กรุณากรอกชื่อ เบอร์โทร และที่อยู่ให้ครบถ้วน');
    }
    return {
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      address: dto.address.trim(),
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7)),
    };
  }

  private normalizeCustomer(value: unknown): Customer {
    if (!this.isRecord(value)) throw new Error('รูปแบบข้อมูลลูกค้าจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    const id = value['id'];
    if ((typeof id !== 'number' && typeof id !== 'string') || String(id).trim() === '') {
      throw new Error('ข้อมูลลูกค้าจากเซิร์ฟเวอร์ไม่มีรหัสลูกค้าที่ถูกต้อง');
    }
    return {
      id,
      name: this.readString(value, 'name'),
      phone: this.readString(value, 'phone'),
      address: this.readString(value, 'address'),
      latitude: this.parseCoordinate(value['latitude'], 'ละติจูด', 90),
      longitude: this.parseCoordinate(value['longitude'], 'ลองจิจูด', 180),
      ...(typeof value['created_at'] === 'string' ? { created_at: value['created_at'] } : {}),
      ...(value['distance_km'] !== undefined
        ? { distance_km: this.parseDistance(value['distance_km']) }
        : {}),
    };
  }

  private parseCoordinate(value: unknown, label: string, limit: number): number {
    const number =
      typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
        ? Number(value)
        : Number.NaN;
    if (!Number.isFinite(number) || Math.abs(number) > limit) {
      throw new Error(`${label}ต้องเป็นตัวเลขระหว่าง ${-limit} ถึง ${limit}`);
    }
    return number;
  }

  private parseDistance(value: unknown): number {
    const distance =
      typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
        ? Number(value)
        : Number.NaN;
    if (!Number.isFinite(distance) || distance < 0)
      throw new Error('ระยะทางลูกค้าจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    return distance;
  }

  private readString(value: Record<string, unknown>, field: string): string {
    if (typeof value[field] !== 'string')
      throw new Error(`ข้อมูลลูกค้าจากเซิร์ฟเวอร์ไม่มีฟิลด์ ${field} ที่ถูกต้อง`);
    return value[field];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
