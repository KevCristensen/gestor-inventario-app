import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// Interfaz para el producto pivoteado, mejora la claridad del código.
interface PivotedProduct {
  productName: string;
  barcode: string;
  stocksByCollege: { [key: string]: { stock: number; min_stock: number } };
}

@Component({
  selector: 'app-global-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass],
  templateUrl: './global-inventory.component.html',
})
export class GlobalInventoryComponent implements OnInit, OnDestroy {
  pivotedInventory: PivotedProduct[] = [];
  collegeHeaders: string[] = [];
  searchTerm: string = '';

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadGlobalInventory(); // Carga inicial

    // Configuración del "debouncer" para la búsqueda
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400), // Espera 400ms después de la última pulsación
      distinctUntilChanged(), // Solo emite si el texto ha cambiado
      switchMap((term: string) => this.inventoryService.getGlobalInventory(term))
    ).subscribe(data => {
      this.processInventoryData(data);
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  loadGlobalInventory(): void {
    this.inventoryService.getGlobalInventory().subscribe(data => {
      this.processInventoryData(data);
    });
  }

  private processInventoryData(data: any[]): void {
    const productMap = new Map<string, PivotedProduct>();
    const collegeSet = new Set<string>();

    data.forEach(item => {
      collegeSet.add(item.entity_name);
      let product = productMap.get(item.barcode);
      if (!product) {
        product = { productName: item.name, barcode: item.barcode, stocksByCollege: {} };
        productMap.set(item.barcode, product);
      }
      product.stocksByCollege[item.entity_name] = { stock: item.stock, min_stock: item.min_stock_level };
    });

    this.pivotedInventory = Array.from(productMap.values());
    this.collegeHeaders = Array.from(collegeSet).sort(); // Ahora usamos directamente las abreviaturas
    this.cdr.detectChanges();
  }
}