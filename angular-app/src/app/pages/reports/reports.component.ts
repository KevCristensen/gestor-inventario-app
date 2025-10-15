import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, formatDate, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../services/analysis.service';
import { EntitiesService } from '../../services/entities.service';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service'; // Importamos el servicio de inventario

// Interfaz para el reporte de salidas consolidadas
interface ExitGroup {
  notes: string;
  user_name: string;
  timestamp: string;
  items: { name: string; quantity: number }[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe], // Añadimos los pipes
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  // Estado general
  isLoading = false;
  reportType: 'consumption' | 'consolidated_exit' = 'consumption';

  // Filtros
  startDate: string;
  endDate: string;
  entities: any[] = [];
  selectedEntityId: string | number = 'all';

  // Datos para Análisis de Consumo
  consumptionData: any[] = [];
  totalConsumptionValue: number = 0;

  // Datos para Reporte de Salidas
  exitGroups: ExitGroup[] = [];

  constructor(
    private analysisService: AnalysisService,
    private entitiesService: EntitiesService,
    private authService: AuthService,
    private inventoryService: InventoryService, // Inyectamos el servicio
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.startDate = formatDate(today, 'yyyy-MM-dd', 'en-US');
    this.endDate = formatDate(today, 'yyyy-MM-dd', 'en-US');
  }

  ngOnInit(): void {
    this.loadEntities();
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.selectedEntityId = currentUser.entity_id;
    }
    this.loadData();
  }

  loadEntities(): void {
    this.entitiesService.getEntities().subscribe(data => {
      this.entities = data;
    });
  }

  // Método principal que carga datos según la pestaña activa
  loadData(): void {
    this.isLoading = true;
    if (this.reportType === 'consumption') {
      this.loadConsumptionReport();
    } else if (this.reportType === 'consolidated_exit') {
      this.loadConsolidatedExitReport();
    }
  }

  loadConsumptionReport(): void {
    this.analysisService.getConsumption(this.startDate, this.endDate, this.selectedEntityId as any)
      .subscribe({
        next: (data) => {
          this.consumptionData = data;
          this.totalConsumptionValue = data.reduce((sum, item) => sum + Number(item.totalValue), 0);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isLoading = false; this.cdr.detectChanges(); }
      });
  }

  loadConsolidatedExitReport(): void {
    this.inventoryService.getExitsByDate(this.startDate, this.endDate, this.selectedEntityId as any)
      .subscribe({
        next: (data) => {
          this.exitGroups = this.groupExits(data);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isLoading = false; this.cdr.detectChanges(); }
      });
  }

  groupExits(exits: any[]): ExitGroup[] {
    const groups: { [key: string]: ExitGroup } = {};
    for (const exit of exits) {
      const key = `${exit.notes}-${exit.movement_timestamp}`;
      if (!groups[key]) {
        groups[key] = {
          notes: exit.notes,
          user_name: exit.user_name,
          timestamp: exit.movement_timestamp,
          items: [],
        };
      }
      groups[key].items.push({ name: exit.product_name, quantity: exit.quantity });
    }
    return Object.values(groups).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  setPeriod(period: 'today' | 'this_month' | 'last_month'): void {
    const today = new Date();
    if (period === 'today') {
      this.startDate = formatDate(today, 'yyyy-MM-dd', 'en-US');
      this.endDate = formatDate(today, 'yyyy-MM-dd', 'en-US');
    } else if (period === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      this.startDate = formatDate(firstDay, 'yyyy-MM-dd', 'en-US');
      this.endDate = formatDate(today, 'yyyy-MM-dd', 'en-US');
    } else if (period === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      this.startDate = formatDate(firstDay, 'yyyy-MM-dd', 'en-US');
      this.endDate = formatDate(lastDay, 'yyyy-MM-dd', 'en-US');
    }
    this.loadData();
  }

  printReport(): void {
    if (this.reportType === 'consumption') {
      this.printConsumptionReport();
    } else if (this.reportType === 'consolidated_exit') {
      this.printConsolidatedExitReport();
    }
  }

  private printConsumptionReport(): void {
    if (this.consumptionData.length === 0) return;
    let entityNameToPrint = 'Todas las Bodegas';
    if (this.selectedEntityId !== 'all' && this.consumptionData.length > 0) {
      entityNameToPrint = this.consumptionData[0].entityName;
    }
    const reportPayload = {
      reportData: this.consumptionData,
      startDate: this.startDate,
      endDate: this.endDate,
      entityName: entityNameToPrint,
      totalValue: this.totalConsumptionValue,
    };
    window.electronAPI.send('print-analysis', reportPayload);
  }

  private printConsolidatedExitReport(): void {
    // Corregimos cómo obtenemos el nombre de la bodega.
    let entityNameToPrint = 'Todas las Bodegas';
    if (this.selectedEntityId !== 'all') {
      const selectedEntity = this.entities.find(e => e.id === this.selectedEntityId);
      if (selectedEntity) {
        entityNameToPrint = selectedEntity.name;
      }
    }
    const printData = {
      reportTitle: `Reporte Consolidado de Salidas`,
      dateRange: { start: this.startDate, end: this.endDate },
      entityName: entityNameToPrint,
      groups: this.exitGroups,
    };
    window.electronAPI.send('print-consolidated-exit-report', printData);
  }
}
