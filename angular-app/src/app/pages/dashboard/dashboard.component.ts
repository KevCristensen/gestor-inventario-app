import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { ConnectionService } from '../../services/connection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  groupedLowStockItems: { [key: string]: any[] } = {};
  sortConfig = { key: 'current_stock', direction: 'asc' };
  summary: any = { products: 0, providers: 0 };
  private reconnectedSubscription: Subscription;

  constructor(
    private dashboardService: DashboardService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef
  ) {
    this.reconnectedSubscription = this.connectionService.reconnected$.subscribe(() => {
      console.log('Reconexión detectada, recargando datos del dashboard...');
      this.loadData(); // Llama a la función unificada
    });
  }

  ngOnInit(): void {
    this.loadData(); // Llama a la función unificada
  }

  ngOnDestroy(): void {
    this.reconnectedSubscription.unsubscribe();
  }

  // ESTA ES AHORA LA ÚNICA FUNCIÓN QUE CARGA TODOS LOS DATOS
  loadData(): void {
    // Carga las alertas de stock bajo (con ordenamiento)
    this.dashboardService.getLowStockAlerts(this.sortConfig.key, this.sortConfig.direction).subscribe(data => {
      // Agrupa los datos aquí
      this.groupedLowStockItems = this.groupItemsByEntity(data);
      this.cdr.detectChanges();
    });

    // Carga el resumen
    this.dashboardService.getSummary().subscribe(data => {
      this.summary = data;
      this.cdr.detectChanges();
    });
  }

  groupItemsByEntity(items: any[]): { [key: string]: any[] } {
    return items.reduce((acc, item) => {
      const key = item.entity_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }

  setSort(key: string): void {
    if (this.sortConfig.key === key) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.key = key;
      this.sortConfig.direction = 'asc';
    }
    this.loadData(); // Llama a la función unificada
  }

  getObjectKeys(obj: any) {
    return Object.keys(obj);
  }
}