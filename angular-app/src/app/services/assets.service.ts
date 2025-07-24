import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private apiUrl = 'http://localhost:3000/api/assets';

  constructor(private http: HttpClient) { }

  getAssets(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createAsset(asset: any): Observable<any> {
    return this.http.post(this.apiUrl, asset);
  }

  updateAsset(id: number, asset: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, asset);
  }

  deleteAsset(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inventory`);
  }
}