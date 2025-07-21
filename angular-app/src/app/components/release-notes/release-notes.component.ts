import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-release-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './release-notes.component.html', // Asegúrate de que esta línea sea correcta
})
export class ReleaseNotesComponent { // Asegúrate de que la clase esté exportada
  @Input() version: string = '';
  @Input() notes: string[] = [];
  @Output() close = new EventEmitter<void>();
}