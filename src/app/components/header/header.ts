import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  templateUrl: './header.html',
})
export class Header {
  private router = inject(Router);

  isRiderMode = false;

  protected readonly navigationItems = [
    {
      label: 'ลูกค้า',
      description: 'จัดการข้อมูลลูกค้า',
      route: '/customer-management',
    },
    {
      label: 'คำสั่งซื้อ',
      description: 'จัดการออเดอร์',
      route: '/order-management',
    },
    {
      label: 'จัดส่ง',
      description: 'วางแผนเส้นทาง',
      route: '/route-dashboard',
    },
  ];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isRiderMode = event.urlAfterRedirects.includes('/rider');
    });
  }
}