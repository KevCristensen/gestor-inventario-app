import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provider-form.component.html',
})
export class ProviderFormComponent {
  @Input() provider: any = {};
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  // Esta función se llama cuando se envía el formulario
  onSubmit(): void {
    // Emite el evento 'save' con los datos del proveedor
    this.save.emit(this.provider);
  }
}