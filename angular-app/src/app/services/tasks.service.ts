import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private apiUrl = `${environment.apiUrl}/api/tasks`;

  constructor(private http: HttpClient) { }

  // Obtiene todas las tareas para una entidad (colegio) específica
  getTasks(entityId: number, month?: string): Observable<any[]> {
    let params = new HttpParams().set('entity_id', entityId.toString());
    if (month) {
      params = params.set('month', month);
    }
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  // Crea una nueva tarea
  createTask(taskData: any): Observable<any> {
    return this.http.post(this.apiUrl, taskData);
  }

  // Actualiza una tarea existente
  updateTask(taskId: number, taskData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${taskId}`, taskData);
  }

  // Elimina una tarea
  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${taskId}`);
  }

  // Actualiza el estado y/o las observaciones de una tarea
  updateTaskStatus(taskId: number, data: { status?: string, observations?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${taskId}`, data);
  }

  // Asigna un producto a un requerimiento de la pauta
  assignProductToTask(taskId: number, requiredProductName: string, chosenProductId: number | null): Observable<any> {
    return this.http.post(`${this.apiUrl}/${taskId}/assign-product`, { requiredProductName, chosenProductId });
  }

  // Obtiene los detalles de una tarea específica
  getTaskById(taskId: number, entityId: number): Observable<any> {
    const params = new HttpParams().set('entity_id', entityId.toString());
    return this.http.get<any>(`${this.apiUrl}/${taskId}`, { params });
  }
}
