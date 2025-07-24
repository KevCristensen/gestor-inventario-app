import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-form.component.html',
})
export class AssetFormComponent {
  @Input() asset: any = {};
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  // Lista de categorías para el selector
  categories: string[] = [
    'Vajilla', 'Cubertería', 'Contenedores GN', 
    'Utensilios de Cocina', 'Equipos Eléctricos', 'Textiles', 'Otros'
  ];

  onSubmit(): void {
    this.save.emit(this.asset);
  }
}