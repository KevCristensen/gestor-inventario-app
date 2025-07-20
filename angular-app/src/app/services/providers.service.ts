import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProvidersService {
  private apiUrl = 'http://localhost:3000/api/providers';

  constructor(private http: HttpClient) { }

  getProviders(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
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