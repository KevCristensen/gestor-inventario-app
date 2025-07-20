import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { EntitiesService } from '../../services/entities.service';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-global-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-inventory.component.html',
})
export class GlobalInventoryComponent implements OnInit {
  inventory: any[] = [];
  groupedInventory: any = {};

  entities: any[] = [];
  selectedEntityId: string = 'all';
  searchTerm: string = '';

  constructor(
    private dashboardService: DashboardService,
    private entitiesService: EntitiesService, 
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.loadInventory();
    this.loadEntities();
  }

  groupInventoryByProduct(): void {
    this.groupedInventory = this.inventory.reduce((acc, item) => {
      acc[item.name] = acc[item.name] || [];
      acc[item.name].push(item);
      return acc;
    }, {});
  }

  loadEntities(): void {
    this.entitiesService.getEntities().subscribe(data => {
      this.entities = data;
      this.cdr.detectChanges();
    });
  }

  loadInventory(): void {
    this.dashboardService.getGlobalInventory().subscribe(data => {
      this.inventory = data;
      this.filterAndGroupInventory();
      this.cdr.detectChanges();
    });
  }

  filterAndGroupInventory(): void {
    let filteredItems = this.inventory;

    // Primero, filtra por colegio (si se ha seleccionado uno)
    if (this.selectedEntityId !== 'all') {
      filteredItems = filteredItems.filter(item => item.entity_id == this.selectedEntityId);
    }

    // Luego, filtra por el término de búsqueda (si existe)
    if (this.searchTerm.trim() !== '') {
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.groupedInventory = filteredItems.reduce((acc, item) => {
      acc[item.name] = acc[item.name] || [];
      acc[item.name].push(item);
      return acc;
    }, {});
  }

  onFilterChange(): void {
    this.filterAndGroupInventory();
  }
  
  getObjectKeys(obj: any) {
    return Object.keys(obj);
  }
}