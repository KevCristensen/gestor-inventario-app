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
      filteredItems = this.rawInventory.filter(item =>
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Ahora, el resto del código usa 'filteredItems' en lugar de 'this.rawInventory'
    const uniqueColleges = [...new Set(filteredItems.map(item => item.entity_name))];
    this.collegeHeaders = uniqueColleges.sort();

    const groupedByProduct = filteredItems.reduce((acc, item) => {
      acc[item.name] = acc[item.name] || {};
      acc[item.name][item.entity_name] = { 
        stock: item.stock, 
        min_stock: item.min_stock_level 
      };
      return acc;
    }, {});

    this.pivotedInventory = Object.keys(groupedByProduct).map(productName => {
      return {
        productName: productName,
        stocksByCollege: groupedByProduct[productName]
      };
    });
  }

  // Esta función ahora será llamada por el input de búsqueda
  onSearchChange(): void {
    this.processInventoryData();
  }
}