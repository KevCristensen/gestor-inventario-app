import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { EntitiesService } from '../../services/entities.service';

@Component({
  selector: 'app-global-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass],
  templateUrl: './global-inventory.component.html',
})
export class GlobalInventoryComponent implements OnInit {
  rawInventory: any[] = [];
  pivotedInventory: any[] = [];
  collegeHeaders: string[] = [];
  searchTerm: string = '';

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.dashboardService.getGlobalInventory().subscribe(data => {
      this.rawInventory = data;
      this.processInventoryData();
      this.cdr.detectChanges();
    });
  }

  processInventoryData(): void {
    if (this.rawInventory.length === 0) {
      this.collegeHeaders = [];
      this.pivotedInventory = [];
      return;
    }

    let filteredItems = this.rawInventory;
    if (this.searchTerm.trim() !== '') {
      const lowerCaseSearch = this.searchTerm.toLowerCase();
      filteredItems = this.rawInventory.filter(item =>
        item.name.toLowerCase().includes(lowerCaseSearch) ||
        item.barcode.toLowerCase().includes(lowerCaseSearch)
      );
    }

    const uniqueColleges = [...new Set(filteredItems.map(item => item.entity_name))];
    this.collegeHeaders = uniqueColleges.sort();

    // Agrupamos por código de barras, que es único para cada producto.
    const groupedByProduct = filteredItems.reduce((acc, item) => {
      // Usamos el código de barras como clave única.
      if (!acc[item.barcode]) {
        acc[item.barcode] = {
          name: item.name, // Guardamos el nombre del producto.
          stocksByCollege: {}
        };
      }
      // Añadimos el stock para el colegio actual.
      acc[item.barcode].stocksByCollege[item.entity_name] = { 
        stock: item.stock, 
        min_stock: item.min_stock_level 
      };
      return acc;
    }, {});

    this.pivotedInventory = Object.keys(groupedByProduct).map(barcode => {
      return {
        productName: groupedByProduct[barcode].name,
        barcode: barcode, // La clave ahora es el código de barras.
        stocksByCollege: groupedByProduct[barcode].stocksByCollege
      };
    });
  }

  // Esta función ahora será llamada por el input de búsqueda
  onSearchChange(): void {
    this.processInventoryData();
  }
}