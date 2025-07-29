import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = 'http://localhost:3000/api/analysis';

  constructor(private http: HttpClient) { }


  getConsumption(startDate: string, endDate: string, entityId?: string): Observable<any[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    // Solo añade el entityId si no es 'all'
    if (entityId && entityId !== 'all') {
      params = params.append('entityId', entityId);
    }

    return this.http.get<any[]>(`${this.apiUrl}/consumption`, { params });
  }



  getMonthlyConsumption(year: number, month: number, entityId?: number): Observable<any[]> {
    let params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    
    if (entityId) {
      params = params.append('entityId', entityId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/monthly-consumption`, { params });
  }

  getLossAndDamageReport(startDate: string, endDate: string, entityId?: string): Observable<any[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    if (entityId && entityId !== 'all') {
      params = params.append('entityId', entityId);
    }

    return this.http.get<any[]>(`${this.apiUrl}/loss-damage`, { params });
  }

}