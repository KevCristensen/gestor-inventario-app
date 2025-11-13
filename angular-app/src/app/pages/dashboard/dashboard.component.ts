import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { ConnectionService } from '../../services/connection.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { EntitiesService } from '../../services/entities.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  groupedLowStockItems: { [key: string]: any[] } = {};
  sortConfig = { key: 'name', direction: 'asc' };
  // --- ¡MODIFICADO! ---
  summary: any = { 
    products: 0, 
    providers: 0, 
    stockByEntity: [], // Stock total por bodega
    dailySummaries: [] // ¡MODIFICADO! Ahora es un array de resúmenes diarios
  };
  private reconnectedSubscription: Subscription;
  // Propiedades para la animación de conteo
  displayProducts = 0;
  displayProviders = 0;
  displayStockByEntity: { [key: string]: number } = {};
  
  // --- ¡NUEVO! Propiedades para separar los resúmenes diarios ---
  currentUser: any;
  currentUserDailySummary: any = null;
  otherCollegesDailySummaries: any[] = [];
  isOtherCollegesCollapsed = true; // Por defecto, la sección estará plegada

  // --- ¡NUEVO! ---
  collapsedSections: { [key: string]: boolean } = {};

  constructor(
    private dashboardService: DashboardService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private entitiesService: EntitiesService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.reconnectedSubscription = this.connectionService.reconnected$.subscribe(() => {
      console.log('Reconexión detectada, recargando datos del dashboard...');
      this.loadData(); // Llama a la función unificada
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.reconnectedSubscription.unsubscribe();
  }

  loadData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.entity_id) {
      this.dashboardService.getLowStockAlerts(this.sortConfig.key, this.sortConfig.direction).subscribe(data => {
        this.groupedLowStockItems = this.groupItemsByEntity(data);
        this.cdr.detectChanges();
      });

      this.dashboardService.getSummary().subscribe(data => {
        this.summary = data;
        this.animateCountUp('products', data.products);
        this.animateCountUp('providers', data.providers);

        // --- ¡NUEVO! Separamos el resumen del usuario actual del resto ---
        if (this.currentUser && data.dailySummaries) {
          this.currentUserDailySummary = data.dailySummaries.find((s: any) => s.id === this.currentUser.entity_id);
          this.otherCollegesDailySummaries = data.dailySummaries.filter((s: any) => s.id !== this.currentUser.entity_id);
        }

        data.stockByEntity.forEach((entity: any) => {
          this.animateStockCountUp(entity.entity_name, entity.total_stock);
        });
      });
    }
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
    this.loadData();
  }

  getObjectKeys(obj: any) {
    return Object.keys(obj);
  }

  private animateCountUp(property: 'products' | 'providers', endValue: number) {
    const duration = 1500; // Duración de la animación en milisegundos
    const steps = 50; // Número de pasos en la animación
    const stepDuration = duration / steps;
    if (endValue === 0) {
      // Evitar división por cero y animación innecesaria
      return;
    }
    const increment = endValue / steps;

    let current = 0;
    // --- ¡CORRECCIÓN! ---
    // Mapeamos la propiedad del summary a la propiedad que se muestra en el template.
    const displayPropertyMap = {
      products: 'displayProducts',
      providers: 'displayProviders'
    };
    const displayProperty = (displayPropertyMap as any)[property];
    if (!displayProperty) {
      return; // Si la propiedad no existe en el mapa, no hacemos nada.
    }

    const interval = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        (this as any)[displayProperty] = endValue;
        this.cdr.detectChanges();
        clearInterval(interval);
      } else {
        (this as any)[displayProperty] = Math.floor(current);
        this.cdr.detectChanges();
      }
    }, stepDuration);
  }

  private animateStockCountUp(entityName: string, endValue: number) {
    const duration = 1500;
    const steps = 50;
    const stepDuration = duration / steps;
    if (endValue === 0) {
      this.displayStockByEntity[entityName] = 0;
      return;
    }
    const increment = endValue / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        this.displayStockByEntity[entityName] = endValue;
        this.cdr.detectChanges();
        clearInterval(interval);
      } else {
        this.displayStockByEntity[entityName] = Math.floor(current);
        this.cdr.detectChanges();
      }
    }, stepDuration);
  }

  // --- ¡NUEVO! ---
  toggleLowStockSection(entityName: string): void {
    this.collapsedSections[entityName] = !this.collapsedSections[entityName];
  }

  // --- ¡NUEVO! ---
  toggleOtherCollegesSection(): void {
    this.isOtherCollegesCollapsed = !this.isOtherCollegesCollapsed;
  }
}