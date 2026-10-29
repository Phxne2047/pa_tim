export type OrderStatus = 'pending' | 'assigned' | 'delivering' | 'delivered' | 'cancelled';

export interface Order {
  id: string | number;
  customer_id?: string | number;
  boxes: number; // 1 - 3 กล่อง
  menu: string;
  status: OrderStatus;
  created_at?: string;

  // Joined Customer Information
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  address?: string;
  customer_address?: string;
  latitude?: number | string;
  longitude?: number | string;
  distance_km?: number;
}

export interface CreateOrderDto {
  customer_id?: string | number;
  boxes: number; // 1 - 3 กล่อง
  menu: string;
  status?: OrderStatus | string;
}

export interface OrderItem {
  rawId: number | string;
  id: string;
  customer_id?: number | string;
  name: string;
  phone: string;
  address: string;
  menu: string;
  boxes: number;
  time: string;
  lat: number;
  lng: number;
  created_at?: string;
}
