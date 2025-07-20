import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProvidersService } from '../../services/providers.service';
import { ProductsService } from '../../services/products.service';
import { ReceptionsService } from '../../services/receptions.service';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-inventory-reception',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-reception.component.html',
})
export class InventoryReceptionComponent implements OnInit, AfterViewInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef;
  
  providerList: any[] = [];
  reception = {
    provider_id: null,
    user_id: 1, // Fijo por ahora, luego lo tomaremos de la sesión
    invoice_number: '',
    transport_temp: null,
    items: [] as any[],
    entity_id: null, 
  };

  constructor(
    private providersService: ProvidersService,
    private productsService: ProductsService,
    private receptionsService: ReceptionsService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.providersService.getProviders().subscribe(data => {
      this.providerList = data;
      this.cdr.detectChanges(); 
    });
  }

  ngAfterViewInit(): void {
    this.barcodeInput.nativeElement.focus();
  }

  onBarcodeScanned(barcode: string): void {
    if (!barcode) return;

    this.productsService.getProductByBarcode(barcode).subscribe({
      next: (product) => {
        const existingItem = this.reception.items.find(item => item.product_id === product.id);
        if (existingItem) {
          existingItem.quantity++;
        } else {
          this.reception.items.push({
            product_id: product.id,
            name: product.name,
            quantity: 1,
            lot_number: '',
            expiration_date: this.getFormattedDate(90), // Vencimiento por defecto a 90 días
            product_temp: null,
          });
        }
        this.cdr.detectChanges(); 
      },
      error: (err) => alert(`Producto con código ${barcode} no encontrado.`)
    });
  }

  removeItem(productId: number): void {
    this.reception.items = this.reception.items.filter(item => item.product_id !== productId);
  }

  saveReception(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      alert('Error: No se pudo identificar al usuario.');
      return;
    }
    // Asigna el user_id y el entity_id del usuario logueado
    this.reception.user_id = currentUser.id;
    this.reception.entity_id = currentUser.entity_id;

    this.receptionsService.createReception(this.reception).subscribe({
      next: () => {
        alert('Recepción guardada exitosamente.');
        this.resetForm();
      },
      error: (err) => {
        console.error(err);
        alert('Error al guardar la recepción.');
      }
    });
  }

  resetForm(): void {
    this.reception = {
      provider_id: null,
      user_id: 1,
      invoice_number: '',
      transport_temp: null,
      items: [],
      entity_id: null,
    };
    this.cdr.detectChanges();
    this.barcodeInput.nativeElement.focus();
  }

  private getFormattedDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }
}