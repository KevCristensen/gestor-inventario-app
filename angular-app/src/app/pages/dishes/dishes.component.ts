import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DishesService, Dish } from '../../services/dishes.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-dishes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dishes.component.html',
})
export class DishesComponent implements OnInit {
  dishes: Dish[] = [];
  isLoading = true;
  isModalOpen = false;
  editingDishId: number | null = null;

  newDish: Dish = {
    name: '',
    type: 'normal',
    ingredients: []
  };

  constructor(
    private dishesService: DishesService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDishes();
  }

  loadDishes(): void {
    this.isLoading = true;
    this.dishesService.getAllDishes().subscribe({
      next: (data) => {
        this.dishes = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showError('Error al cargar los platillos.');
        this.cdr.detectChanges();
      }
    });
  }

  openModal(dish: Dish | null = null): void {
    if (dish) {
      // Editando un platillo existente
      this.editingDishId = dish.id!;
      // Clonamos el objeto para no modificar la lista directamente
      this.newDish = JSON.parse(JSON.stringify(dish));
    } else {
      // Creando un nuevo platillo
      this.resetForm();
    }
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingDishId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.newDish = { name: '', type: 'normal', ingredients: [] };
  }

  addIngredient(): void {
    this.newDish.ingredients.push({ product_name: '', grammage: 0 });
  }

  removeIngredient(index: number): void {
    this.newDish.ingredients.splice(index, 1);
  }

  saveDish(): void {
    if (!this.newDish.name || this.newDish.ingredients.length === 0) {
      this.notificationService.showError('El nombre y al menos un ingrediente son requeridos.');
      return;
    }

    const operation = this.editingDishId
      ? this.dishesService.updateDish(this.editingDishId, this.newDish)
      : this.dishesService.createDish(this.newDish);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Platillo ${this.editingDishId ? 'actualizado' : 'creado'} exitosamente.`);
        this.closeModal();
        this.loadDishes();
      },
      error: (err) => {
        this.notificationService.showError(err.error?.error || 'Error al guardar el platillo.');
      }
    });
  }

  deleteDish(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este platillo? Esta acción no se puede deshacer.')) {
      this.dishesService.deleteDish(id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Platillo eliminado exitosamente.');
          this.loadDishes();
        },
        error: (err) => {
          this.notificationService.showError(err.error?.error || 'Error al eliminar el platillo.');
        }
      });
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}

