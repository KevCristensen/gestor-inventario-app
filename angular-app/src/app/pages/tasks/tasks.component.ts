import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service'; // Reutilizamos para obtener usuarios
import { ProductsService } from '../../services/products.service';
import { finalize } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

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
  editingTaskId: number | null = null;

  isModalOpen = false;

  // Datos para el formulario de nueva tarea
  newTask: any = {
    title: '',
    description: '',
    due_date: '',
    menuSections: [], // Reemplazamos menu_details por una estructura
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
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const today = new Date();
    // Formato YYYY-MM para el input month
    this.selectedMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  ngOnInit(): void {
    // ngOnInit se ejecuta solo una vez. Mantenemos aquí las cargas iniciales.
    this.loadUsersAndProducts();
    this.loadTasks();

    // Esta suscripción se mantiene para detectar cambios si ya estamos en la página
    this.route.queryParams.subscribe((params: Params) => {
      console.log('🚩 FLAG A: QueryParams detectados:', params);
      if (params['editTaskId']) {
        console.log(`🚩 FLAG B: editTaskId=${params['editTaskId']} encontrado. Abriendo modal...`);
        // Usamos setTimeout para desacoplar la apertura del modal del ciclo de detección actual.
        setTimeout(() => this.openEditModal(+params['editTaskId']), 0);
      }
    });
  }

  loadTasks(): void {
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser() as User;
    if (currentUser?.entity_id) {
      this.tasksService.getTasks(currentUser.entity_id, this.selectedMonth)
        .subscribe({
          next: (data: any[]) => {
            this.tasks = data;
            this.isLoading = false;
            this.cdr.detectChanges(); // Notificamos a Angular que actualice la vista con las nuevas pautas.
          },
          error: (err) => {
            this.tasks = [];
            this.isLoading = false;
            this.cdr.detectChanges(); // También actualizamos si hay un error.
          }
        });
    } else {
      this.isLoading = false;
      this.tasks = [];
      this.cdr.detectChanges(); // Y si no hay usuario.
    }
  }

  loadUsersAndProducts(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.entity_id) {
      // Obtenemos todos los usuarios y filtramos los del mismo colegio
      this.chatService.getUsers().subscribe(users => {
        this.allUsers = users.filter(u => u.entity_id === currentUser.entity_id);
      });
    }
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

  openEditModal(taskId: number): void {
    // Si ya hay un modal abierto, no hacemos nada para evitar conflictos.
    if (this.isModalOpen) {
      return;
    }
    // Limpiamos la URL inmediatamente para evitar que la lógica se vuelva a ejecutar.
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.entity_id) return;

    this.tasksService.getTaskById(taskId, currentUser.entity_id).subscribe(taskToEdit => {
      // ¡NUEVA LÓGICA! Parseamos el JSON guardado para reconstruir el formulario.
      let menuSections = [];
      try {
        if (taskToEdit.menu_details && typeof taskToEdit.menu_details === 'string') {
          menuSections = JSON.parse(taskToEdit.menu_details);
        }
      } catch (e) {
        // ¡NUEVA LÓGICA DE RESGUARDO!
        // Si no es JSON, es HTML antiguo. Lo guardamos en una estructura de "solo texto"
        // para no perderlo al volver a guardar la pauta.
        console.warn('El detalle del menú no es un JSON válido (HTML antiguo). Se mostrará como texto para resguardarlo.');
        menuSections = [{
          title: 'Detalles (Formato Antiguo)',
          items: [{
            type: 'text', title: 'Contenido Original', description: 'Por favor, reconstruya este menú con el nuevo formato. El contenido original se ha perdido en la conversión.'
          }]
        }];
      }

      this.newTask = {
        title: taskToEdit.title,
        description: taskToEdit.description,
        due_date: new Date(taskToEdit.due_date).toISOString().split('T')[0],
        menuSections: menuSections, // Cargamos los detalles del menú parseados
        assignedUsers: taskToEdit.assignedUsers.map((u: any) => u.id),
        requiredProducts: taskToEdit.requiredProducts.map((p: any) => ({
          product_id: p.product_id,
          name: p.name,
          required_quantity: p.required_quantity,
          // El backend ahora usa `required_unit`, el formulario usa `unit`. Unificamos.
          unit: p.required_unit
        }))
      };
      this.editingTaskId = taskId;
      this.isModalOpen = true;
      // Forzamos la detección de cambios para que la vista se actualice y muestre el modal.
      this.cdr.detectChanges();
    });
  }

  closeModal(): void {
    this.isModalOpen = false; // Solo cerramos el modal
    this.resetNewTaskForm(); // Reseteamos el estado del formulario
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

    // Convertimos la estructura de menuSections a un string JSON para guardarlo.
    // Filtramos cualquier sección o ítem vacío para no guardar basura.
    const cleanedMenuSections = this.newTask.menuSections
      .map((section: any) => ({
        ...section,
        items: section.items.filter((item: any) => item.title || (item.ingredients && item.ingredients.length > 0))
      }))
      .filter((section: any) => section.title || section.items.length > 0);

    const payload = {
      title: this.newTask.title,
      description: this.newTask.description,
      due_date: this.newTask.due_date,
      assignedUsers: this.newTask.assignedUsers,
      requiredProducts: this.newTask.requiredProducts,
      menu_details: JSON.stringify(cleanedMenuSections), // Envía el JSON
      entity_id: currentUser.entity_id,
      created_by: currentUser.id
    };

    const operation = this.editingTaskId
      ? this.tasksService.updateTask(this.editingTaskId, payload)
      : this.tasksService.createTask(payload);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Pauta ${this.editingTaskId ? 'actualizada' : 'creada'} exitosamente.`);
        this.closeModal();
        // Usamos setTimeout para asegurar que la recarga ocurra en un nuevo ciclo de detección de cambios,
        // evitando el error ExpressionChangedAfterItHasBeenCheckedError.
        setTimeout(() => this.loadTasks(), 0);
      },
      error: (err) => this.notificationService.showError(err.error?.error || `Error al ${this.editingTaskId ? 'actualizar' : 'crear'} la pauta.`)
    });
  }

  resetNewTaskForm(): void {
    this.editingTaskId = null;
    this.newTask = {
      title: '',
      description: '',
      due_date: '',
      menuSections: [],
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

  // --- Métodos para el Constructor de Menús ---
  addMenuSection() {
    this.newTask.menuSections.push({ title: 'NUEVO MENÚ', items: [] });
  }

  removeMenuSection(sectionIndex: number) {
    this.newTask.menuSections.splice(sectionIndex, 1);
  }

  addMenuItem(sectionIndex: number, type: 'table' | 'text' | 'postre' | 'salad') {
    if (type === 'table') {
      this.newTask.menuSections[sectionIndex].items.push({ rationsTitle: '', title: 'Nuevo Plato', type: 'table', ingredients: [{ product: '', gramaje: '', cantidad: '', total: '', isHighlighted: false }], notes: [''] });
    } else if (type === 'postre') {
      this.newTask.menuSections[sectionIndex].items.push({ rationsTitle: '', title: 'Nuevo Postre', type: 'postre', ingredients: [{ product: '', gramaje: '', isHighlighted: false }], notes: [] });
    } else if (type === 'salad') {
      this.newTask.menuSections[sectionIndex].items.push({ rationsTitle: '', title: 'Nuevo Salad Bar', type: 'salad', ingredients: [{ product: '', fuentes: '', isHighlighted: false }], notes: [] });
    } else {
      this.newTask.menuSections[sectionIndex].items.push({ title: 'Nuevo Ítem', type: 'text', description: '' });
    }
  }

  removeMenuItem(sectionIndex: number, itemIndex: number) {
    this.newTask.menuSections[sectionIndex].items.splice(itemIndex, 1);
  }

  addIngredient(sectionIndex: number, itemIndex: number) {
    const itemType = this.newTask.menuSections[sectionIndex].items[itemIndex].type;
    let newIngredient: any = { isHighlighted: false };
    if (itemType === 'table') newIngredient = { ...newIngredient, product: '', gramaje: '', cantidad: '', total: '' };
    else if (itemType === 'postre') newIngredient = { ...newIngredient, product: '', gramaje: '' };
    else if (itemType === 'salad') newIngredient = { ...newIngredient, product: '', fuentes: '' };
    
    this.newTask.menuSections[sectionIndex].items[itemIndex].ingredients.push(newIngredient);
  }

  removeIngredient(sectionIndex: number, itemIndex: number, ingredientIndex: number) {
    this.newTask.menuSections[sectionIndex].items[itemIndex].ingredients.splice(ingredientIndex, 1);
  }

  addNote(sectionIndex: number, itemIndex: number) {
    if (!this.newTask.menuSections[sectionIndex].items[itemIndex].notes) {
      this.newTask.menuSections[sectionIndex].items[itemIndex].notes = [];
    }
    this.newTask.menuSections[sectionIndex].items[itemIndex].notes.push('');
  }

  removeNote(sectionIndex: number, itemIndex: number, noteIndex: number) {
    this.newTask.menuSections[sectionIndex].items[itemIndex].notes.splice(noteIndex, 1);
  }

  // --- Funciones TrackBy para optimizar el rendimiento de los bucles @for ---
  trackBySection(index: number, section: any): number {
    return index; // O un ID único si las secciones tuvieran uno
  }

  trackByItem(index: number, item: any): number {
    return index; // O un ID único si los ítems tuvieran uno
  }

  trackByIngredient(index: number, ingredient: any): number {
    return index;
  }

  trackByNote(index: number, note: any): number {
    return index;
  }
}
