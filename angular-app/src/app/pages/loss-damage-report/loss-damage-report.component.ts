import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../services/analysis.service';
import { EntitiesService } from '../../services/entities.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-loss-damage-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loss-damage-report.component.html',
})
export class LossDamageReportComponent implements OnInit {
  reportData: any[] = [];
  isLoading = false;

  totalLosses: number = 0;
  totalDamages: number = 0;
  
  startDate: string;
  endDate: string;
  entities: any[] = [];
  selectedEntityId: string | number = 'all';

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
    // En el inicio, solo llamamos a cargar las entidades.
    this.loadEntities();
  }

  loadEntities(): void {
    this.entitiesService.getEntities().subscribe(data => {
      this.entities = data;
      
      // Una vez que las entidades han cargado, configuramos el filtro por defecto.
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.selectedEntityId = currentUser.entity_id;
      }
      
      // Y AHORA, generamos el reporte inicial.
      this.onFilterChange();
    });
  }

  onFilterChange(): void {
    this.isLoading = true;
    this.reportData = [];
    
    this.analysisService.getLossAndDamageReport(this.startDate, this.endDate, this.selectedEntityId as any)
      .subscribe({
        next: (data) => {
          this.reportData = data;
          
          // LÓGICA PARA CALCULAR TOTALES
          this.totalLosses = data.reduce((sum, item) => sum + Number(item.totalLoss), 0);
          this.totalDamages = data.reduce((sum, item) => sum + Number(item.totalDamage), 0);
          
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () =>  {
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
    const currentEntity = this.entities.find(e => e.id == this.selectedEntityId);
    const entityName = currentEntity ? currentEntity.name : 'Todas las Bodegas';

    const reportPayload = {
      reportData: this.reportData,
      startDate: this.startDate,
      endDate: this.endDate,
      entityName: entityName,
      totalLosses: this.totalLosses,
      totalDamages: this.totalDamages
    };
    window.electronAPI.send('print-loss-damage-report', reportPayload);
  }
}