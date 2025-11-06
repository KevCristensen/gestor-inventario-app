import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

  // NUEVO: Estado de carga para un producto requerido específico
  updatingRequirement: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public tasksService: TasksService,
    private authService: AuthService,
    private entitiesService: EntitiesService,
    private cdr: ChangeDetectorRef // Asegúrate de que esté inyectado
  ) {}

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId) {
      this.loadTaskDetails(+taskId);
    }
  }

  private loadTaskDetails(taskId: number): void {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser();

    if (taskId && currentUser?.entity_id) {
      const entityRequest = this.entitiesService.getEntityById(currentUser.entity_id);
      const taskRequest = this.tasksService.getTaskById(+taskId, currentUser.entity_id);
      
      forkJoin([entityRequest, taskRequest]).subscribe({
        next: ([entity, taskData]) => {
          this.entityName = entity.name;
          // Procesamos los datos JSON que vienen como strings desde el backend
          const processedTask = this.processRawTaskData(taskData);
          this.task = processedTask;

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


  /**
   * Procesa los datos crudos de la tarea, convirtiendo los campos JSON (que llegan como strings)
   * en objetos/arrays de JavaScript y generando el HTML para el menú.
   */
  private processRawTaskData(task: any): any {
    const processedTask = { ...task };
    
    // 1. Asignar `assigned_users` (el backend ahora lo envía como un array de objetos)
    processedTask.assigned_users = processedTask.assigned_users || [];

    // 2. Asignar `required_products` (el backend ahora lo envía como objeto enriquecido)
    // y unificar el nombre de la propiedad para la plantilla.
    processedTask.requiredProducts = processedTask.required_products || [];
    for (const reqProduct of processedTask.requiredProducts) {
      reqProduct.required_unit = reqProduct.unit; // Unificamos la propiedad de unidad
    }

    // 2. Parsear `menu_details` para que la plantilla pueda iterar sobre él.
    try {
      processedTask.menuSections = JSON.parse(processedTask.menu_details || '[]');
    } catch (e) {
      console.error('El detalle del menú no es un JSON válido, se mostrará como texto.', e);
      processedTask.menuSections = [];
    }
    return processedTask;
  }

  updateStatus(newStatus: string): void {
    if (!this.task) return;
    const payload = { status: newStatus };
    this.tasksService.updateTaskStatus(this.task.id, payload).subscribe({
      next: () => {
        this.task.status = newStatus;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al actualizar el estado', err)
    });
  }

  calculateNeededUnits(requiredProduct: any, suggestedProduct: any): number | string {
    // Esta función puede ser más compleja dependiendo de las unidades
    if (requiredProduct.required_unit === 'un') {
      return requiredProduct.required_quantity;
    }
    // Asumimos conversión simple si no es por unidad
    const requiredAmountInBase = requiredProduct.required_quantity; // Asumiendo que ya está en gramos
    const productAmountInBase = suggestedProduct.weight;
    if (productAmountInBase <= 0) return 'N/A';
    return Math.ceil(requiredAmountInBase / productAmountInBase);
  }

  selectProductForRequirement(requiredProductName: string, chosenProductId: number | null): void {
    if (!this.task || this.updatingRequirement) return; // Evita clics múltiples

    this.updatingRequirement = requiredProductName; // Inicia el estado de carga para este producto

    this.tasksService.assignProductToTask(this.task.id, requiredProductName, chosenProductId).subscribe({
      next: () => {
        // Actualización optimista: actualizamos el estado localmente para una respuesta instantánea.
        const reqProduct = this.task.requiredProducts.find((p: any) => p.name === requiredProductName);
        if (reqProduct) {
          reqProduct.chosen_product_id = chosenProductId;
          // Si quitamos la selección, también limpiamos el objeto `chosenProduct` si existe.
          if (chosenProductId === null) {
            reqProduct.chosenProduct = null;
          }
        }
        this.updatingRequirement = null; // Finaliza el estado de carga
        this.cdr.detectChanges();
      }
    });
  }

  editTask(): void {
    // Navegamos a la página de pautas y pasamos el ID de la tarea a editar como un parámetro en la URL.
    this.router.navigate(['/dashboard/tasks'], { queryParams: { editTaskId: this.task.id } });
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
