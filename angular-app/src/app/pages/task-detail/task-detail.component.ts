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
    const currentUser = this.authService.getCurrentUser();

    if (taskId && currentUser?.entity_id) {
      const entityRequest = this.entitiesService.getEntityById(currentUser.entity_id);
      const taskRequest = this.tasksService.getTaskById(+taskId, currentUser.entity_id);
      
      forkJoin([entityRequest, taskRequest]).subscribe({
        next: ([entity, taskData]) => {
          this.entityName = entity.name;
          this.task = this.processTaskMenuDetails(taskData); // Procesamos el menú
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

  // Convierte el JSON del menú a HTML para mostrarlo
  private processTaskMenuDetails(task: any): any {
    if (!task.menu_details) {
      return task;
    }

    try {
      const menuSections = JSON.parse(task.menu_details);
      let menuDetailsHtml = '';

      for (const section of menuSections) {
        menuDetailsHtml += `<h3>${section.title || ''}</h3>`;
        for (const item of section.items) {
          if (item.type === 'table' || item.type === 'postre' || item.type === 'salad') {
            if (item.rationsTitle) menuDetailsHtml += `<h4>${item.rationsTitle}</h4>`;
            menuDetailsHtml += `<p><strong>${item.title}</strong></p>`;
          }

          if (item.type === 'table') {
            menuDetailsHtml += '<table><thead><tr><th>PRODUCTO</th><th>GRAMAJE</th><th>CANTIDAD</th><th>TOTAL</th></tr></thead><tbody>';
            for (const ing of item.ingredients) menuDetailsHtml += `<tr${ing.isHighlighted ? ' class="highlighted-row"' : ''}><td>${ing.product || ''}</td><td>${ing.gramaje || ''}</td><td>${ing.cantidad || ''}</td><td>${ing.total || ''}</td></tr>`;
            menuDetailsHtml += '</tbody></table>';
          } else if (item.type === 'postre') {
            menuDetailsHtml += '<table><thead><tr><th>PRODUCTO</th><th>GRAMAJE</th></tr></thead><tbody>';
            for (const ing of item.ingredients) menuDetailsHtml += `<tr${ing.isHighlighted ? ' class="highlighted-row"' : ''}><td>${ing.product || ''}</td><td>${ing.gramaje || ''}</td></tr>`;
            menuDetailsHtml += '</tbody></table>';
          } else if (item.type === 'salad') {
            menuDetailsHtml += '<table><thead><tr><th>PRODUCTO</th><th>FUENTES</th></tr></thead><tbody>';
            for (const ing of item.ingredients) menuDetailsHtml += `<tr${ing.isHighlighted ? ' class="highlighted-row"' : ''}><td>${ing.product || ''}</td><td>${ing.fuentes || ''}</td></tr>`;
            menuDetailsHtml += '</tbody></table>';
          } else { // type 'text'
            menuDetailsHtml += `<p><strong>${item.title}</strong><br>${item.description}</p>`;
          }

          if (item.notes && item.notes.length > 0) {
            item.notes.forEach((note: string) => { if (note) menuDetailsHtml += `<p><em>${note}</em></p>`; });
          }
        }
      }
      // Sobreescribimos la propiedad con el HTML generado
      return { ...task, menu_details: menuDetailsHtml };
    } catch (e) {
      console.error('El detalle del menú no es un JSON válido, se mostrará como texto.', e);
      return task; // Devuelve la tarea original si falla el parseo
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

  selectProductForRequirement(taskProductId: number, chosenProductId: number | null): void {
    this.tasksService.setChosenProduct(taskProductId, chosenProductId).subscribe(() => {
      // Recargamos los datos para reflejar la selección
      this.isLoading = true;
      this.ngOnInit();
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
