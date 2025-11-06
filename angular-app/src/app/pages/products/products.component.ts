import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ProductsService } from '../../services/products.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductFormComponent, FormsModule],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: any[] = [];
  isModalOpen = false;
  currentProduct: any = {};

  // Propiedades de paginación
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;
  
  searchTerm: string = '';
  // --- NUEVO: Lógica para Debouncing ---
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  // ------------------------------------

  constructor(
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadProducts(); // Carga inicial de productos

    // --- NUEVO: Configuración del Debouncer ---
    this.searchSubscription = this.searchSubject.pipe(
      // 1. Espera 400ms después de la última pulsación de tecla
      debounceTime(400),
      // 2. Solo emite si el texto de búsqueda ha cambiado realmente
      distinctUntilChanged(),
      // 3. Cancela la búsqueda anterior y lanza una nueva
      switchMap((term: string) => {
        this.currentPage = 1; // Resetea a la página 1 en cada nueva búsqueda
        return this.productsService.getProducts(this.currentPage, this.itemsPerPage, term);
      })
    ).subscribe(response => {
      this.products = response.data;
      this.totalItems = response.total;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    // Limpieza de la suscripción para evitar fugas de memoria
    this.searchSubscription.unsubscribe();
  }

  loadProducts(): void {
    this.productsService.getProducts(this.currentPage, this.itemsPerPage, this.searchTerm).subscribe(response => {
      this.products = response.data;
      this.totalItems = response.total;
      this.cdr.detectChanges();
    });
  }

  onSearchChange(): void {
    // En lugar de llamar a loadProducts() directamente,
    // emitimos el nuevo término al Subject. RxJS se encarga del resto.
    this.searchSubject.next(this.searchTerm);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  openModal(product?: any): void {
    this.currentProduct = product ? { ...product } : {};
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveProduct(product: any): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Error: No se pudo identificar al usuario.');
      return;
    }

    if (product.id) {
      product.updated_by = currentUser.id;
    } else {
      product.created_by = currentUser.id;
    }
    
    const operation = product.id
      ? this.productsService.updateProduct(product.id, product)
      : this.productsService.createProduct(product);

    operation.subscribe(() => {
      this.notificationService.showSuccess(`Producto ${product.id ? 'actualizado' : 'creado'} correctamente.`);
      this.closeModal();
      this.loadProducts();
    });
  }

  deleteProduct(productId: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      this.productsService.deleteProduct(productId).subscribe(() => {
        this.notificationService.showSuccess('Producto eliminado correctamente.');
        this.loadProducts();
      });
    }
  }
}