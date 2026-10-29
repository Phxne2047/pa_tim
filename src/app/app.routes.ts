import { Routes } from '@angular/router';
import { CustomerManagement } from './pages/customer-management/customer-management';
import { OrderManagement } from './pages/order-management/order-management';
import { RouteDashboard } from './pages/route-dashboard/route-dashboard';
import { Rider } from './pages/rider/rider';
export const routes: Routes = [
    { path: '', redirectTo: 'customer-management', pathMatch: 'full' },
    { path: 'order-management', component: OrderManagement },
    { path: 'customer-management', component: CustomerManagement },
    { path: 'route-dashboard', component: RouteDashboard },
    { path: 'rider', component: Rider },
];