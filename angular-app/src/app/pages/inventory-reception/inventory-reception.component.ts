import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { ProvidersService } from '../../services/providers.service';
import { ProductsService } from '../../services/products.service';
import { ReceptionsService } from '../../services/receptions.service';
import { AuthService } from '../../services/auth.service'; 
import { NotificationService } from '../../services/notification.service'; 
import { EntitiesService } from '../../services/entities.service'; 
import { ConnectionService } from '../../services/connection.service'; 

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
  entityName: string = '';
  isSaving = false; 

  private reconnectedSubscription: Subscription; 

  constructor(
    private providersService: ProvidersService,
    private productsService: ProductsService,
    private receptionsService: ReceptionsService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private notificationService: NotificationService,
    private entitiesService: EntitiesService,
    private connectionService: ConnectionService
  ) {
    this.reconnectedSubscription = this.connectionService.reconnected$.subscribe(() => {
      console.log('Reconexión detectada, recargando datos de Recepción...');
      this.loadInitialData();
    });
  }

  ngOnInit(): void {
    // ngOnInit ahora solo llama a la función principal de carga.
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.providersService.getAllProviders().subscribe(data => {
      this.providerList = data;
      this.cdr.detectChanges(); 
    });

    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.entity_id) {
      this.entitiesService.getEntityById(currentUser.entity_id).subscribe(entity => {
        this.entityName = entity.name;
      });
    }
  }

  ngAfterViewInit(): void {
    this.barcodeInput.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.reconnectedSubscription.unsubscribe();
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
      this.notificationService.showError('Error: No se pudo identificar al usuario.');
      return;
    }
    // Asigna el user_id y el entity_id del usuario logueado
    this.reception.user_id = currentUser.id;
    this.reception.entity_id = currentUser.entity_id;
    this.isSaving = true;

    this.receptionsService.createReception(this.reception).pipe(
      finalize(() => this.isSaving = false) // <-- Desbloquea al finalizar
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Recepción guardada exitosamente.');
        this.resetForm();
      },
      error: (err) => {
        console.error(err);
        const errorMessage = err.error?.error || 'Ocurrió un error inesperado.';
        this.notificationService.showError(errorMessage);
      }
    });
  }

  printReceipt() {
    // Construye el objeto de datos para la boleta
    const receiptData = {
        type: 'Recepción', // o 'Salida' en el otro componente
        timestamp: new Date(),
        user: this.authService.getCurrentUser(),
        entityName: this.entityName, // Necesitarás obtenerlo como en el layout
        notes: this.reception.invoice_number, // o this.exitData.notes
        items: this.reception.items, // o this.exitData.items
    };
    
    // Envía los datos al proceso principal para imprimir
    //(window as any).electronAPI.send('print-receipt', receiptData);
    window.electronAPI.send('print-receipt', receiptData);
    
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