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
  summary = { products: 0, providers: 0 };
  private reconnectedSubscription: Subscription;
  // Propiedades para la animación de conteo
  displayProducts = 0;
  displayProviders = 0;

  constructor(
    private dashboardService: DashboardService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private entitiesService: EntitiesService
  ) {
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
    const increment = endValue / steps;

    let current = 0;
    const displayProperty = property === 'products' ? 'displayProducts' : 'displayProviders';

    const interval = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        this[displayProperty] = endValue;
        this.cdr.detectChanges();
        clearInterval(interval);
      } else {
        this[displayProperty] = Math.floor(current);
        this.cdr.detectChanges();
      }
    }, stepDuration);
  }
}