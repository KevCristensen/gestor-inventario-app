import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReleaseNotesComponent } from './components/release-notes/release-notes.component'; // 1. Importa el componente

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ReleaseNotesComponent], // 2. Añade los imports
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  showReleaseNotes = false; // 3. Propiedades para manejar el modal
  releaseNotesData: { version: string, notes: string[] } = { version: '', notes: [] };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Comprueba si la API de Electron está disponible antes de usarla
    if (window.electronAPI && typeof window.electronAPI.on === 'function') {
      window.electronAPI.on('show-release-notes', (version, notes) => {
        this.releaseNotesData = { version, notes };
        this.showReleaseNotes = true;
        this.cdr.detectChanges();
      });
    }
  }

  closeReleaseNotes(): void {
    this.showReleaseNotes = false;
  }
}