import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProvidersService {
  private apiUrl = 'http://localhost:3000/api/providers';

  constructor(private http: HttpClient) { }

  getProviders(page: number, limit: number): Observable<any> {
    // Envía los parámetros de paginación en la URL
    return this.http.get<any>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  getAllProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all/list`);
  }

  // --- NUEVOS MÉTODOS ---
  createProvider(provider: any): Observable<any> {
    return this.http.post(this.apiUrl, provider);
  }

  updateProvider(id: number, provider: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, provider);
  }

  deleteProvider(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}