import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  // Apuntamos a la ruta que ya existe en tu backend de Express
  private apiUrl = 'http://localhost:3000/api/chat';

  constructor(private http: HttpClient) { }

  // Este método reemplaza al que estaba en ChatService
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }
}