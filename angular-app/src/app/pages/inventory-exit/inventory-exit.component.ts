import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../services/products.service';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory-exit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-exit.component.html',
})
export class InventoryExitComponent implements OnInit, AfterViewInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef;
  
  exitData = {
    user_id: null as number | null,
    entity_id: null as number | null,
    notes: '',
    items: [] as any[],
  };

  constructor(
    private productsService: ProductsService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.exitData.user_id = currentUser.id;
      this.exitData.entity_id = currentUser.entity_id;
    }
  }

  ngAfterViewInit(): void {
    this.barcodeInput.nativeElement.focus();
  }

  onBarcodeScanned(barcode: string): void {
    if (!barcode) return;

    this.productsService.getProductByBarcode(barcode).subscribe({
      next: (product) => {
        const existingItem = this.exitData.items.find(item => item.product_id === product.id);
        if (existingItem) {
          existingItem.quantity++;
        } else {
          this.exitData.items.push({
            product_id: product.id,
            name: product.name,
            quantity: 1,
          });
        }
        this.cdr.detectChanges();
      },
      error: () => alert(`Producto con código ${barcode} no encontrado.`)
    });
  }

  removeItem(productId: number): void {
    this.exitData.items = this.exitData.items.filter(item => item.product_id !== productId);
  }

  saveExit(): void {
    if (this.exitData.items.length === 0) {
      alert('Debe añadir al menos un producto.');
      return;
    }
    this.inventoryService.createExit(this.exitData).subscribe({
      next: () => {
        alert('Salida registrada exitosamente.');
        this.resetForm();
      },
      error: (err) => {
        // El mensaje específico del backend viene en err.error.error
        const errorMessage = err.error?.error || 'Ocurrió un error inesperado.';
        alert(errorMessage);
      }
    });
  }

  resetForm(): void {
    this.exitData.items = [];
    this.exitData.notes = '';
    this.cdr.detectChanges();
    this.barcodeInput.nativeElement.focus();
  }
}