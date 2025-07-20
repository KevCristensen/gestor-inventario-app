import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  groupedLowStockItems: { [key: string]: any[] } = {};
  sortConfig = { key: 'current_stock', direction: 'asc' };

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.dashboardService.getLowStockAlerts(this.sortConfig.key, this.sortConfig.direction).subscribe(data => {
      this.groupedLowStockItems = this.groupItemsByEntity(data);
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
    this.loadAlerts();
  }

  getObjectKeys(obj: any) {
    return Object.keys(obj);
  }
}