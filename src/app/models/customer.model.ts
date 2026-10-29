export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  created_at?: string;
  distance_km?: number;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}
