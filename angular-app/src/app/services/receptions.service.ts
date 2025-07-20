// en services/receptions.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReceptionsService {
  private apiUrl = 'http://localhost:3000/api/receptions';

  constructor(private http: HttpClient) { }

  createReception(receptionData: any): Observable<any> {
    return this.http.post(this.apiUrl, receptionData);
  }
}