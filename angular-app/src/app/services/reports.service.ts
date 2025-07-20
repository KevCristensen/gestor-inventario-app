import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) { }

  downloadInventoryReport(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/inventory-movements`, {
      responseType: 'blob' // ¡Importante! Le decimos que espere un archivo
    });
  }
}