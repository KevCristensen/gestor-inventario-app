import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = 'http://localhost:3000/api/inventory';

  constructor(private http: HttpClient) { }

  createExit(exitData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/exit`, exitData);
  }

  getExitsByDate(startDate: string, endDate: string, entityId: string | number): Observable<any[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (entityId !== 'all') {
      params = params.set('entityId', entityId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/exits-by-date`, { params });
  }
}