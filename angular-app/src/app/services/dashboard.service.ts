import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) { }

  getLowStockAlerts(sortBy: string = 'current_stock', order: string = 'asc'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all-low-stock-alerts?sortBy=${sortBy}&order=${order}`);
  }

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary`);
  }

}