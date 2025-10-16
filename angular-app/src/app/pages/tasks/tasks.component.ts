import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service'; // Reutilizamos para obtener usuarios
import { ProductsService } from '../../services/products.service';
import { NotificationService } from '../../services/notification.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {
  tasks: any[] = [];
  isLoading = false;
  
  // Filtros de fecha
  selectedMonth: string;
  currentYear = new Date().getFullYear();

  isModalOpen = false;

  // Datos para el formulario de nueva tarea
  newTask: any = {
    title: '',
    description: '',
    due_date: '',
    assignedUsers: [],
    requiredProducts: []
  };
  
  // Listas para los selectores del formulario
  allUsers: any[] = [];
  allProducts: any[] = [];

  // Para añadir productos a la tarea
  productSearchTerm: string = '';
  filteredProducts: any[] = [];
  productToAdd = { product_id: null, name: '', required_quantity: 1, unit: 'un' };

  suggestedProducts: any[] = [];

  constructor(
    private tasksService: TasksService,
    private authService: AuthService,
    private chatService: ChatService,
    private productsService: ProductsService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    // Formato YYYY-MM para el input month
    this.selectedMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.loadTasks();
    this.loadUsersAndProducts();
  }

  loadTasks(): void {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser() as User;
    if (currentUser?.entity_id) {
      this.tasksService.getTasks(currentUser.entity_id, this.selectedMonth)
        .subscribe({
          next: (data) => {
          this.tasks = data;
            this.isLoading = false;
          this.cdr.detectChanges();
          },
          error: () => this.isLoading = false,
        });
    } else {
      this.isLoading = false;
    }
  }

  loadUsersAndProducts(): void {
    const currentUser = this.authService.getCurrentUser();
    // Obtenemos todos los usuarios y filtramos los del mismo colegio
    this.chatService.getUsers().subscribe(users => {
      this.allUsers = users.filter(u => u.entity_id === currentUser?.entity_id);
    });
    // Obtenemos todos los productos para el selector
    this.productsService.getAllProducts().subscribe(products => {
      this.allProducts = products;
    });
  }

  onDateFilterChange(): void { this.loadTasks(); }


  openModal(): void {
    // Al abrir el modal, establecemos la fecha de hoy como valor por defecto.
    const today = new Date().toISOString().split('T')[0];
    this.newTask.due_date = today;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetNewTaskForm();
    this.loadTasks();
  }

  filterProducts(): void {
    if (this.productSearchTerm) {
      const lowerCaseSearch = this.productSearchTerm.toLowerCase();
      this.filteredProducts = this.allProducts.filter(p =>
        p.name.toLowerCase().includes(lowerCaseSearch) || 
        (p.brand && p.brand.toLowerCase().includes(lowerCaseSearch)) ||
        p.barcode.toLowerCase().includes(lowerCaseSearch)
      );
    } else {
      this.filteredProducts = [];
    }
  }

  selectProduct(product: any): void {
    this.productSearchTerm = product.name;
    this.productToAdd.product_id = product.id;
    this.productToAdd.name = product.name;
    this.filteredProducts = []; // Ocultar la lista
  }

  addProductToTask(): void {
    // Permitir añadir si hay un término de búsqueda (genérico) o un producto seleccionado
    if ((!this.productSearchTerm && !this.productToAdd.product_id) || this.productToAdd.required_quantity <= 0) {
      this.notificationService.showError('Escriba o seleccione un producto y una cantidad válida.');
      return;
    }

    // Si no se ha seleccionado un producto de la lista, lo tratamos como genérico
    if (!this.productToAdd.product_id) {
      this.productToAdd.name = this.productSearchTerm;
    }

    // Evitar duplicados por nombre
    if (this.newTask.requiredProducts.some((p: any) => p.name.toLowerCase() === this.productToAdd.name.toLowerCase())) {
      this.notificationService.showError('Este producto ya está en la lista.');
      return;
    }

    this.newTask.requiredProducts.push({
      product_id: this.productToAdd.product_id, // Será null si es genérico
      name: this.productToAdd.name,
      required_quantity: this.productToAdd.required_quantity,
      unit: this.productToAdd.unit
    });
    this.resetProductAdd();
  }

  removeProductFromTask(productId: number): void {
    this.newTask.requiredProducts = this.newTask.requiredProducts.filter((p: any) => p.product_id !== productId);
  }

  toggleUserAssignment(userId: number): void {
    const index = this.newTask.assignedUsers.indexOf(userId);
    if (index > -1) {
      this.newTask.assignedUsers.splice(index, 1);
    } else {
      this.newTask.assignedUsers.push(userId);
    }
  }

  createTask(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const payload = {
      ...this.newTask,
      entity_id: currentUser.entity_id,
      created_by: currentUser.id,
    };

    this.tasksService.createTask(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Pauta creada exitosamente.');
        this.closeModal();
      },
      error: (err) => this.notificationService.showError(err.error?.error || 'Error al crear la pauta.')
    });
  }

  resetNewTaskForm(): void {
    this.newTask = {
      title: '',
      description: '',
      due_date: '',
      assignedUsers: [],
      requiredProducts: []
    };
    this.resetProductAdd();
  }

  resetProductAdd(): void {
    this.productSearchTerm = '';
    this.productToAdd = { product_id: null, name: '', required_quantity: 1, unit: 'un' };
    this.suggestedProducts = [];
  }

  deleteTask(taskId: number, event: MouseEvent): void {
    event.preventDefault(); // Evita la navegación al hacer clic en el botón
    event.stopPropagation(); // Detiene la propagación del clic
    if (confirm('¿Estás seguro de que quieres eliminar esta pauta?')) {
      this.tasksService.deleteTask(taskId).subscribe(() => {
        this.notificationService.showSuccess('Pauta eliminada correctamente.');
        this.loadTasks();
      });
    }
  }
}
