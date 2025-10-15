import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = `${environment.apiUrl}/api/products`; 

  constructor(private http: HttpClient) { }

  getProducts(page: number, limit: number, searchTerm?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (searchTerm && searchTerm.trim() !== '') {
      params = params.set('search', searchTerm);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  getAllProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all/list`);
  }

  createProduct(product: any): Observable<any> {
    return this.http.post(this.apiUrl, product);
  }

  updateProduct(id: number, product: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getProductByBarcode(barcode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/barcode/${barcode}`);
  }
  
  lookupProductByBarcode(barcode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/lookup/${barcode}`);
  }
}