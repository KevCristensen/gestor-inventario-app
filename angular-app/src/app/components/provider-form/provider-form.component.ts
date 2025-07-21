import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provider-form.component.html',
})
export class ProviderFormComponent implements OnInit {
  _provider: any = {};
  @Input() set provider(value: any) {
    this._provider = value;
    this.updateDaysCheckboxes();
  }
  get provider(): any {
    return this._provider;
  }
  
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  // Objeto para manejar los checkboxes
  deliveryDays: any = { lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false };
  
  ngOnInit(): void {
    this.updateDaysCheckboxes();
  }

  updateDaysCheckboxes(): void {
    // Resetea todos los días
    Object.keys(this.deliveryDays).forEach(day => this.deliveryDays[day] = false);
    // Marca los días que vienen de la base de datos
    if (this.provider.delivery_days) {
      const daysFromDB = this.provider.delivery_days.split(',');
      daysFromDB.forEach((day: string) => {
        if (this.deliveryDays.hasOwnProperty(day)) {
          this.deliveryDays[day] = true;
        }
      });
    }
  }

  onSubmit(): void {
    // Convierte los checkboxes seleccionados a un string
    const selectedDays = Object.keys(this.deliveryDays).filter(day => this.deliveryDays[day]);
    this.provider.delivery_days = selectedDays.join(',');
    
    this.save.emit(this.provider);
  }

  get dayKeys() {
    return Object.keys(this.deliveryDays);
  }
}