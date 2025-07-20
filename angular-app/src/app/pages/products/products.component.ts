import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';

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

  // Necesitamos pasar el ID del usuario logueado al crear/editar
  // Por ahora, lo dejaremos fijo. Más adelante lo tomaremos de la sesión.
  private loggedInUserId = 1;

  constructor(
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productsService.getProducts().subscribe(data => {
      this.products = data;
      this.cdr.detectChanges();
    });
  }

  openModal(product?: any): void {
    this.currentProduct = product ? { ...product } : {};
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveProduct(product: any): void {
    // Asigna el usuario que crea o actualiza el registro
    if (product.id) {
      product.updated_by = this.loggedInUserId;
    } else {
      product.created_by = this.loggedInUserId;
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