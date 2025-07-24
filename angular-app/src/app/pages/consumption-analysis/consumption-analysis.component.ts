import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, formatDate, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../services/analysis.service';
import { EntitiesService } from '../../services/entities.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-consumption-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consumption-analysis.component.html',
})
export class ConsumptionAnalysisComponent implements OnInit {
  reportData: any[] = [];
  isLoading = false;
  
  startDate: string;
  endDate: string;
  entities: any[] = [];
  selectedEntityId: string | number = 'all';
  
  totalConsumptionValue: number = 0;

  constructor(
    private analysisService: AnalysisService,
    private entitiesService: EntitiesService,
    private authService: AuthService,
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
    
    this.onFilterChange();
  }

  loadEntities(): void {
    this.entitiesService.getEntities().subscribe(data => {
      this.entities = data;
    });
  }

  onFilterChange(): void {
    this.isLoading = true;
    this.reportData = [];
    
    this.analysisService.getConsumption(this.startDate, this.endDate, this.selectedEntityId as any)
      .subscribe({
        next: (data) => {
          this.reportData = data;
          this.totalConsumptionValue = data.reduce((sum, item) => sum + Number(item.totalValue), 0);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
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
    this.onFilterChange();
  }

  printReport(): void {
    if (this.reportData.length === 0) return;

    let entityNameToPrint = 'Todas las Bodegas';
    // Si se filtró por una bodega, tomamos el nombre del primer resultado.
    if (this.selectedEntityId !== 'all' && this.reportData.length > 0) {
      entityNameToPrint = this.reportData[0].entityName;
    }
    
    const reportPayload = {
      reportData: this.reportData,
      startDate: this.startDate,
      endDate: this.endDate,
      entityName: entityNameToPrint,
      totalValue: this.totalConsumptionValue,
    };
    window.electronAPI.send('print-analysis', reportPayload);
  }
}