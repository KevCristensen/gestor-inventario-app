import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetMovementsService {
  private apiUrl = 'http://localhost:3000/api/asset-movements';

  constructor(private http: HttpClient) { }

  getMovements(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createMovement(movementData: any): Observable<any> {
    return this.http.post(this.apiUrl, movementData);
  }
}