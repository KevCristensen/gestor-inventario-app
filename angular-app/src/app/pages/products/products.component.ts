import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductFormComponent],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  isModalOpen = false;
  currentProduct: any = {};

  // Propiedades de paginación
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;


  constructor(
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService 
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsService.getProducts(this.currentPage, this.itemsPerPage).subscribe(response => {
      this.products = response.data;
      this.totalItems = response.total;
      this.cdr.detectChanges();
    });
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
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
      this.closeModal();
      this.loadProducts();
    });
  }


  deleteProduct(productId: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      this.productsService.deleteProduct(productId).subscribe(() => {
        this.loadProducts();
      });
    }
  }
}