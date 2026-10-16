import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Api {
  // Base URL ของ Backend API ร้านป้าติ๋ม
  public readonly API_ENDPOINT: string = 'https://backend-pa-tim.vercel.app';
}