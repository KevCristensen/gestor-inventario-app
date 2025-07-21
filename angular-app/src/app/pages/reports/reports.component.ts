import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../services/reports.service';
import { finalize } from 'rxjs'; // <-- La importación correcta es desde 'rxjs'

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  isDownloadingMovements = false;
  isDownloadingReceptions = false;

  constructor(
    private reportsService: ReportsService,
    private cdr: ChangeDetectorRef 
  ) {}

  downloadMovementsReport(): void {
    this.isDownloadingMovements = true;
    this.reportsService.downloadInventoryReport().pipe(
      finalize(() => {
        this.isDownloadingMovements = false;
        this.cdr.detectChanges(); // 3. Añade la detección de cambios
      }) 
    ).subscribe({
      next: (blob) => this.downloadFile(blob, 'reporte-movimientos.csv'),
      error: (err) => {
        console.error('Error al descargar el reporte de movimientos:', err);
        alert('No se pudo generar el reporte.');
      }
    });
  }

  downloadReceptionsReport(): void {
    this.isDownloadingReceptions = true;
    this.reportsService.downloadReceptionsReport().pipe(
      finalize(() => {
        this.isDownloadingReceptions = false;
        this.cdr.detectChanges(); // 3. Añade la detección de cambios
      })
    ).subscribe({
      next: (blob) => this.downloadFile(blob, 'reporte-recepciones.csv'),
      error: (err) => {
        console.error('Error al descargar el reporte de recepciones:', err);
        alert('No se pudo generar el reporte.');
      }
    });
  }

  // Creamos una función reutilizable para la lógica de descarga
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}