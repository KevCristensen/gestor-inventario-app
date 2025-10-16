import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../services/products.service';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { EntitiesService } from '../../services/entities.service';
import { finalize } from 'rxjs';

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
  entityName: string = '';
  isSaving = false; 

  constructor(
    private productsService: ProductsService,
    private inventoryService: InventoryService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private entitiesService: EntitiesService 
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.exitData.user_id = currentUser.id;
      this.exitData.entity_id = currentUser.entity_id;
    }
    if (currentUser?.entity_id) {
      this.entitiesService.getEntityById(currentUser.entity_id).subscribe(entity => {
        this.entityName = entity.name;
      });
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
            quantity: 1
          });
        }
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.showError(`Producto con código ${barcode} no encontrado.`)
    });
  }

  removeItem(productId: number): void {
    this.exitData.items = this.exitData.items.filter(item => item.product_id !== productId);
  }

  saveExit(): void {
    if (this.exitData.items.length === 0) {
      this.notificationService.showError('Debe añadir al menos un producto.');
      return;
    }
    this.isSaving = true; 
    this.inventoryService.createExit(this.exitData).pipe(
      finalize(() => this.isSaving = false) // <-- Desbloquea al finalizar
      ).subscribe({
        next: () => {
          this.notificationService.showSuccess('Salida registrada exitosamente.');
          this.resetForm();
        },
      error: (err) => {
        // El mensaje específico del backend viene en err.error.error
        const errorMessage = err.error?.error || 'Ocurrió un error inesperado.';
        this.notificationService.showError(errorMessage);
      }
    });
  }

  printReceipt() {
    // Construye el objeto de datos para la boleta
    const receiptData = {
        type: 'Salida', // o 'Salida' en el otro componente
        timestamp: new Date(),
        user: this.authService.getCurrentUser(),
        entityName: this.entityName, // Necesitarás obtenerlo como en el layout
        notes: this.exitData.notes, // o this.exitData.notes
        items: this.exitData.items, // o this.exitData.items
    };
    
    // Envía los datos al proceso principal para imprimir
    //(window as any).electronAPI.send('print-receipt', receiptData);
    window.electronAPI.send('print-receipt', receiptData);
  }

  resetForm(): void {
    this.exitData.items = [];
    this.exitData.notes = '';
    this.cdr.detectChanges();
    this.barcodeInput.nativeElement.focus();
  }
}