import { Component, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-product-lookup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-lookup.component.html',
})
export class ProductLookupComponent implements AfterViewInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef;
  
  lookupResult: any | null = null;
  isLoading = false;

  constructor(
    private productsService: ProductsService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef // Importante para arreglar el bug
  ) {}

  ngAfterViewInit(): void {
    this.barcodeInput.nativeElement.focus();
  }

  onBarcodeScanned(barcode: string): void {
    if (!barcode) return;
    
    this.isLoading = true;
    this.lookupResult = null;

    this.productsService.lookupProductByBarcode(barcode).subscribe({
      next: (data) => {
        this.lookupResult = data;
        this.isLoading = false;
        this.cdr.detectChanges(); // Fuerza la actualización de la vista
      },
      error: () => {
        this.notificationService.showError(`Producto con código "${barcode}" no encontrado.`);
        this.isLoading = false;
        this.cdr.detectChanges(); // Fuerza la actualización de la vista
      }
    });
  }
}