import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DishIngredient {
  id?: number;
  product_name: string;
  grammage: number;
}

export interface Dish {
  id?: number;
  name: string;
  type: 'normal' | 'hipocalorico' | 'vegetariano';
  ingredients: DishIngredient[];
}

@Injectable({
  providedIn: 'root'
})
export class DishesService {
  private apiUrl = `${environment.apiUrl}/api/dishes`;

  constructor(private http: HttpClient) { }

  getAllDishes(): Observable<Dish[]> { return this.http.get<Dish[]>(this.apiUrl); }
  createDish(dish: Dish): Observable<any> { return this.http.post(this.apiUrl, dish); }
  updateDish(id: number, dish: Dish): Observable<any> { return this.http.put(`${this.apiUrl}/${id}`, dish); }
  deleteDish(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`); }
}