import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router'; // Re-añadir AuthService y User
import { AuthService, User } from '../../services/auth.service';
import { ProductsService } from '../../services/products.service';
import { DishesService, Dish } from '../../services/dishes.service';
import { UsersService } from '../../services/users.service'; // Importamos el nuevo servicio
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
  isSaving = false; // <-- NUEVA PROPIEDAD PARA BLOQUEAR EL BOTÓN
  
  // Filtros de fecha
  selectedMonth: string;
  currentYear = new Date().getFullYear();
  editingTaskId: number | null = null;

  // Estado para el nuevo modal por pasos
  currentModalStep = 1;

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
 
  // Estado para el nuevo buscador de platillos
  dishSearchTerms: { [sectionIndex: number]: string } = {};
  get filteredDishes() {
    return (sectionIndex: number) => {
      const term = this.dishSearchTerms[sectionIndex]?.toLowerCase();
      return term ? this.allDishes.filter(d => d.name.toLowerCase().includes(term)) : [];
    }
  }
  
  // Listas para los selectores del formulario
  allUsers: any[] = [];
  allProducts: any[] = [];
  currentUser: User | null; // <-- 1. Volvemos a declarar la propiedad
  allDishes: Dish[] = [];

  // Para añadir productos a la tarea
  productSearchTerm: string = '';
  filteredProducts: any[] = [];
  productToAdd = { product_id: null, name: '', required_quantity: 1, unit: 'un' };

  suggestedProducts: any[] = [];

  constructor(
    private tasksService: TasksService,
    private authService: AuthService,
    private productsService: ProductsService,
    private dishesService: DishesService,
    private usersService: UsersService, // Inyectamos el nuevo servicio
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser(); // <-- 3. Volvemos a inicializar currentUser
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
    
    // Obtenemos todos los productos para el selector
    this.productsService.getAllProducts().subscribe(products => {
      this.allProducts = products;
    });
    // Cargamos todos los platillos disponibles
    this.dishesService.getAllDishes().subscribe(dishes => {
      this.allDishes = dishes;
    });

    // Cargar usuarios para la asignación usando el nuevo servicio
    this.usersService.getUsers().subscribe(users => {
      // Añadimos una comprobación para asegurarnos de que currentUser no es null
      if (this.currentUser) { 
        this.allUsers = users.filter(u => u.entity_id === this.currentUser!.entity_id);
      } 
    });
  }

  onDateFilterChange(): void { this.loadTasks(); }


  openModal(): void {
    // Al abrir el modal, establecemos la fecha de hoy como valor por defecto.
    const today = new Date().toISOString().split('T')[0];
    this.newTask.due_date = today;
    this.currentModalStep = 1; // Siempre empezar en el primer paso
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
          title: 'Detalles (Formato Antiguo) - Por favor, migrar a nuevo formato.',
          items: [{
            type: 'legacy',
            // Guardamos el HTML antiguo en un campo para mostrarlo,
            // pero no se podrá editar directamente. Al guardar, este
            // contenido se perderá si no se reconstruye el menú con
            // el nuevo sistema.
            legacy_content: taskToEdit.menu_details 
          }
        ]
        }];
      }

      this.newTask = {
        title: taskToEdit.title,
        description: taskToEdit.description,
        due_date: new Date(taskToEdit.due_date).toISOString().split('T')[0], // Formato YYYY-MM-DD
        menuSections: menuSections,
        // El backend ahora devuelve un array de objetos. Extraemos solo los IDs.
        assignedUsers: (taskToEdit.assigned_users || []).map((u: any) => u.id),
        // El backend devuelve `required_products` como un objeto enriquecido, lo procesamos.
        requiredProducts: (taskToEdit.required_products || []).map((p: any) => ({
            product_id: p.product_id,
            name: p.name,
            required_quantity: p.required_quantity,
            // El backend ahora usa `required_unit`, el formulario usa `unit`. Unificamos.
            unit: p.required_unit || p.unit
          })
        )
      };
      this.editingTaskId = taskId;
      this.currentModalStep = 1; // Empezar en el primer paso al editar
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
    if (this.isSaving) return; // Evita ejecuciones múltiples si ya se está guardando
    this.isSaving = true;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Convertimos la estructura de menuSections a un string JSON para guardarlo.
    // Filtramos cualquier sección o ítem vacío para no guardar basura.
    const cleanedMenuSections = this.newTask.menuSections
      .map((section: any) => ({
        ...section,
        items: section.items.filter((item: any) => 
          item.type === 'legacy' || // Conservar contenido antiguo si aún no se ha migrado
          item.type === 'other' && (item.title || item.description) || // Conservar items de texto
          // Lógica corregida: un platillo es válido si tiene un ID, ya no usamos la cantidad general.
          item.dish_id ||
          // Lógica para los nuevos formatos de postre y ensalada
          (item.type === 'postre' && item.ingredients?.some((i: any) => i.product)) ||
          (item.type === 'salad' && item.ingredients?.some((i: any) => i.product))
        )
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

    operation
      .pipe(
        // El bloque finalize se ejecuta tanto en éxito como en error.
        // Es el lugar perfecto para resetear el estado de 'isSaving'.
        finalize(() => this.isSaving = false)
      )
      .subscribe({
        next: () => {
          // Agrupamos todas las actualizaciones de estado en un solo setTimeout
          // para que se ejecuten en un nuevo ciclo de detección de cambios.
          setTimeout(() => {
            this.notificationService.showSuccess(`Pauta ${this.editingTaskId ? 'actualizada' : 'creada'} exitosamente.`);
            this.closeModal();
            this.loadTasks();
          }, 0);
        },
        error: (err) => this.notificationService.showError(err.error?.error || `Error al ${this.editingTaskId ? 'actualizar' : 'crear'} la pauta.`),
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
      this.tasksService.deleteTask(taskId).subscribe({
        next: () => {
          // Agrupamos la notificación y la recarga en un solo setTimeout.
          setTimeout(() => {
            this.notificationService.showSuccess('Pauta eliminada correctamente.');
            this.loadTasks();
          }, 0);
        },
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

  // Lógica para el nuevo constructor de menús
  addDishToSection(dish: Dish, sectionIndex: number): void {
    const newMenuItem = {
      dish_id: dish.id,
      name: dish.name,
      type: dish.type,
      ingredients: dish.ingredients.map(ing => ({
        product_name: ing.product_name,
        grammage: ing.grammage, // Gramaje por ración
        cantidad: 1, // Cantidad por defecto para cada ingrediente
        total: ing.grammage // Total inicial para cantidad 1
      }))
    };
    this.newTask.menuSections[sectionIndex].items.push(newMenuItem);
    this.dishSearchTerms[sectionIndex] = ''; // Limpiar búsqueda
    this.syncRequiredProducts(); // Sincronizar productos para bodega
  }

  removeMenuItem(sectionIndex: number, itemIndex: number) {
    this.newTask.menuSections[sectionIndex].items.splice(itemIndex, 1);
    this.syncRequiredProducts(); // Sincronizar productos para bodega
  }

  updateIngredientTotal(sectionIndex: number, itemIndex: number, ingredientIndex: number): void {
    const ingredient = this.newTask.menuSections[sectionIndex].items[itemIndex].ingredients[ingredientIndex];
    // Aseguramos que la cantidad no sea negativa
    if (ingredient.cantidad < 0) {
      ingredient.cantidad = 0;
    }
    const quantity = ingredient.cantidad || 0;
    const grammage = ingredient.grammage || 0;
    ingredient.total = grammage * quantity;
    this.syncRequiredProducts(); // Sincronizar productos para bodega
  }

  /**
   * Sincroniza la lista de "Productos Requeridos (para Bodega)"
   * basándose en los platillos y raciones del menú de cocina.
   */
  syncRequiredProducts(): void {
    const kitchenProducts = new Map<string, { totalGrams: number, productId: number | null, unit: string }>();

    // 1. Recolectar y sumar todos los ingredientes de los platillos del menú
    for (const section of this.newTask.menuSections) {
      for (const item of section.items) {
        if (item.ingredients && item.type !== 'legacy' && item.type !== 'other') {          
          for (const ingredient of item.ingredients) {            
            // --- LÓGICA CORREGIDA ---
            // Unificamos la obtención del nombre del producto, ya sea de 'product_name' o 'product'.
            const productNameRaw = ingredient.product_name || ingredient.product;
            if (!productNameRaw) continue; // Si no hay nombre, saltamos al siguiente.

            const productName = productNameRaw.toLowerCase();
            const current = kitchenProducts.get(productName) || { totalGrams: 0, productId: null, unit: 'g' };

            // Sumamos los gramos. Para platillos del recetario, es gramaje * cantidad.
            // Para postres, es solo el gramaje. Para salad bar, no se suma (no tiene gramaje).
            if (item.type === 'postre') {
              current.totalGrams += Number(ingredient.gramaje) || 0;
            } else { // Para 'normal' y otros tipos que puedan tenerlo
              current.totalGrams += (ingredient.grammage || 0) * (ingredient.cantidad || 0);
            }

            // Intentamos encontrar el ID y la unidad del producto para una mejor vinculación
            if (current.productId === null) {
              const product = this.allProducts.find(p => p.name.toLowerCase() === productName);
              if (product) {
                current.productId = product.id;
                current.unit = product.unit_of_measure === 'un' ? 'un' : 'g'; // Asumimos 'g' si no es 'un'
              }
            }
            kitchenProducts.set(productName, current);
          }
        }
      }
    }

    // 2. Reconstruir la lista de productos requeridos
    this.newTask.requiredProducts = Array.from(kitchenProducts.entries()).map(([name, data]) => ({
      product_id: data.productId,
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalizar nombre
      required_quantity: data.totalGrams,
      unit: data.unit // Usamos la unidad encontrada o 'g' por defecto
    }));
  }

  addSaladBar(sectionIndex: number): void {
    this.newTask.menuSections[sectionIndex].items.push({
      type: 'salad',
      title: 'Salad Bar',
      ingredients: [{ product: '', fuentes: '' }]
    });
  }

  addDessert(sectionIndex: number): void {
    this.newTask.menuSections[sectionIndex].items.push({
      type: 'postre',
      title: 'Postre',
      ingredients: [{ product: '', gramaje: '' }]
    });
  }

  addTableIngredient(sectionIndex: number, itemIndex: number): void {
    this.newTask.menuSections[sectionIndex].items[itemIndex].ingredients.push({});
  }

  removeTableIngredient(sectionIndex: number, itemIndex: number, ingredientIndex: number): void {
    this.newTask.menuSections[sectionIndex].items[itemIndex].ingredients.splice(ingredientIndex, 1);
  }

  // Agregamos un nuevo tipo de sección para otros ítems (postres, ensaladas, etc.)
  addOtherItem(sectionIndex: number) {
    this.newTask.menuSections[sectionIndex].items.push({
      type: 'other', // Un tipo simple para texto
      title: 'Nuevo Ítem',
      description: ''
    });
  }

  // El método addNote ya no es necesario con el nuevo sistema de "addOtherItem"
  /*
  addNote(sectionIndex: number, itemIndex: number) {
    if (!this.newTask.menuSections[sectionIndex].items[itemIndex].notes) {
      this.newTask.menuSections[sectionIndex].items[itemIndex].notes = [];
    }
    this.newTask.menuSections[sectionIndex].items[itemIndex].notes.push('');
  }

  removeNote(sectionIndex: number, itemIndex: number, noteIndex: number) {
    this.newTask.menuSections[sectionIndex].items[itemIndex].notes.splice(noteIndex, 1);
  }
  */

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

  // --- Métodos para el Stepper del Modal ---
  nextStep() {
    this.currentModalStep++;
  }

  prevStep() {
    this.currentModalStep--;
  }
}
