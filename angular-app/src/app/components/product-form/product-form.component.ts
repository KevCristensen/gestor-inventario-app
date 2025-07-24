import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent {
  @Input() product: any = {};
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();


  Math = Math;
  // --- AÑADE ESTAS LISTAS ---
  categories: string[] = ['Lácteos', 'Carnes', 'Abarrotes', 'Frutas y Verduras', 'Congelados'];
  units: string[] = ['Unidad', 'Kg', 'Gramo', 'Litro', 'Caja', 'Mililitro', 'Miligramo'];


  onSubmit(): void {
    this.save.emit(this.product);
  }

  onPriceChange(value: any): void {
    if (value !== null && value !== '') {
      this.product.price = Math.round(Number(value));
    } else {
      this.product.price = null;
    }
  }
}