import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TasksService } from '../../services/tasks.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { EntitiesService } from '../../services/entities.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent implements OnInit {
  task: any = null;
  isLoading = true;
  entityName: string = '';

  constructor(
    private route: ActivatedRoute,
    public tasksService: TasksService,
    private authService: AuthService,
    private entitiesService: EntitiesService,
    private cdr: ChangeDetectorRef // Asegúrate de que esté inyectado
  ) {}

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    const currentUser = this.authService.getCurrentUser();

    if (taskId && currentUser?.entity_id) {
      const entityRequest = this.entitiesService.getEntityById(currentUser.entity_id);
      const taskRequest = this.tasksService.getTaskById(+taskId, currentUser.entity_id);
      
      forkJoin([entityRequest, taskRequest]).subscribe({
        next: ([entity, taskData]) => {
          this.entityName = entity.name;
          this.task = taskData;
          this.isLoading = false;
          this.cdr.detectChanges(); // Actualizamos la vista una vez que tenemos todos los datos.
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isLoading = false;
      // Aquí podrías redirigir o mostrar un error
    }
  }

  updateStatus(newStatus: string): void {
    this.tasksService.updateTaskStatus(this.task.id, { status: newStatus }).subscribe(() => {
      this.task.status = newStatus;
      this.cdr.detectChanges();
    });
  }

  // --- Lógica para la selección inteligente de productos ---

  convertToBaseUnits(quantity: number, unit: string): number {
    switch (unit?.toLowerCase()) {
      case 'kg': return quantity * 1000;
      case 'g': return quantity;
      case 'l': return quantity * 1000; // Asumiendo 1L = 1000ml
      case 'ml': return quantity;
      default:
        return quantity; // Para 'un' y otros, la cantidad base es la misma.
    }
  }

  calculateNeededUnits(requiredProduct: any, suggestedProduct: any): number {
    // Si el requerimiento es por unidad, la cantidad necesaria es la misma que la requerida.
    if (requiredProduct.required_unit === 'un') {
      return requiredProduct.required_quantity;
    }

    const requiredAmountInBase = this.convertToBaseUnits(requiredProduct.required_quantity, requiredProduct.required_unit);
    const productAmountInBase = this.convertToBaseUnits(suggestedProduct.weight, suggestedProduct.unit_of_measure);

    if (productAmountInBase <= 0) return Infinity; // No se puede cumplir si el producto no tiene peso/volumen

    // Redondea hacia arriba para asegurar que se cumple el requerimiento
    return Math.ceil(requiredAmountInBase / productAmountInBase);
  }

  selectProductForRequirement(taskProductId: number, chosenProductId: number): void {
    this.tasksService.setChosenProduct(taskProductId, chosenProductId).subscribe(() => {
      // Recargamos los datos para reflejar la selección
      this.isLoading = true;
      this.ngOnInit();
    });
  }

  printTask(): void {
    if (!this.task) return;

    const printData = {
      task: this.task,
      entityName: this.entityName,
      user: this.authService.getCurrentUser(),
      timestamp: new Date(),
    };

    // Envía los datos al proceso principal para imprimir
    window.electronAPI.send('print-task-detail', printData);
  }
}
