export interface RouteStop {
  stop_id: number | string;
  stop_number: number;
  order_id: number | string;
  customer_name: string;
  customer_phone?: string;
  address?: string;
  boxes: number;
  menu?: string;
  latitude: number | string;
  longitude: number | string;
  distance_from_prev_km?: number;
  cumulative_time_min?: number;
  google_map_url?: string;
  status?: string;
}

export interface DeliveryRoute {
  route_id: number | string;
  job_code: string;
  rider_id?: number | string;
  rider_name: string;
  rider_phone?: string;
  route_color?: string;
  total_orders: number;
  total_boxes: number;
  total_distance_km: number;
  estimated_time_min: number;
  delivery_fee: number;
  net_profit: number;
  status?: string;
  stops: RouteStop[];
}

export interface RouteShop {
  name: string;
  address?: string;
  latitude: number | string;
  longitude: number | string;
}

export interface FinancialDashboard {
  total_orders: number;
  total_boxes: number;
  total_riders_used: number;
  total_revenue: number;
  total_food_cost: number;
  total_gross_profit: number;
  total_delivery_cost: number;
  net_profit: number;
  max_delivery_time_min: number;
  is_risk_loss: boolean;
  is_risk_late: boolean;
}

export interface DeliveryRouteResult {
  message?: string;
  shop: RouteShop;
  financial_dashboard: FinancialDashboard;
  routes: DeliveryRoute[];
}
