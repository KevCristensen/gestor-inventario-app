import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  isDownloading = false;

  constructor(private reportsService: ReportsService) {}

  downloadReport(): void {
    this.isDownloading = true;
    this.reportsService.downloadInventoryReport().subscribe({
      next: (blob) => {
        // Lógica para descargar el archivo en el navegador
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte-movimientos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Error al descargar el reporte:', err);
        alert('No se pudo generar el reporte.');
        this.isDownloading = false;
      }
    });
  }
}