import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetMovementsService } from '../../services/asset-movements.service';
import { AssetsService } from '../../services/assets.service';
import { EntitiesService } from '../../services/entities.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-asset-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-movements.component.html',
})
export class AssetMovementsComponent implements OnInit {
  movements: any[] = [];
  assets: any[] = [];
  entities: any[] = [];
  currentUserEntityId: number | null = null;
  
  movementData: {
    type: string,
    from_entity_id: number | null,
    to_entity_id: number | null,
    event_details: string,
    items: any[]
  } = {
    type: 'traslado_salida',
    from_entity_id: null,
    to_entity_id: null,
    event_details: '',
    items: []
  };

  itemToAdd = { asset_id: null, quantity: 1 };

  constructor(
    private assetMovementsService: AssetMovementsService,
    private assetsService: AssetsService,
    private entitiesService: EntitiesService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserEntityId = currentUser.entity_id;
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.assetMovementsService.getMovements().subscribe(data => {
      this.movements = data;
      this.cdr.detectChanges();
    });
    this.assetsService.getAssets().subscribe(data => this.assets = data);
    this.entitiesService.getEntities().subscribe(data => this.entities = data);
  }

  onMovementTypeChange(): void {
    if (this.movementData.type === 'entrada_inicial' || this.movementData.type === 'retorno_evento') {
      this.movementData.to_entity_id = this.currentUserEntityId;
    }
    if (this.movementData.type === 'salida_evento' || this.movementData.type === 'baja') {
      this.movementData.from_entity_id = this.currentUserEntityId;
    }
  }

  addItem(): void {
    if (!this.itemToAdd.asset_id || !this.itemToAdd.quantity) {
      this.notificationService.showError('Seleccione un activo y una cantidad.');
      return;
    }
    
    const asset = this.assets.find(a => a.id == this.itemToAdd.asset_id);

    // --- AÑADE ESTA VALIDACIÓN ---
    if (!asset) {
      this.notificationService.showError('Activo no encontrado.');
      return;
    }

    const newItem = {
      asset_id: asset.id,
      name: asset.name,
      quantity: this.itemToAdd.quantity
    };
    
    this.movementData.items = [...this.movementData.items, newItem];
    this.itemToAdd = { asset_id: null, quantity: 1 };
  }

  removeItem(assetId: number): void {
    this.movementData.items = this.movementData.items.filter(item => item.asset_id !== assetId);
  }

  registerMovement(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showError('No se pudo identificar al usuario.');
      return;
    }
    const payload = { ...this.movementData, user_id: currentUser.id };
    if (payload.type === 'salida_evento') payload.to_entity_id = null;
    if (payload.type === 'retorno_evento') payload.from_entity_id = null;
    if (payload.type === 'baja') payload.to_entity_id = null;
    if (payload.type === 'entrada_inicial') payload.from_entity_id = null;
    
    this.assetMovementsService.createMovement(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Movimiento registrado exitosamente.');
        this.loadInitialData();
        this.resetForm();
      },
      error: (err) => this.notificationService.showError(err.error?.error || 'Error al registrar el movimiento.')
    });
  }
  
  // FUNCIÓN CORREGIDA
  resetForm(): void {
    this.movementData = {
      type: 'traslado_salida',
      from_entity_id: null,
      to_entity_id: null,
      event_details: '',
      items: []
    };
    this.itemToAdd = { asset_id: null, quantity: 1 };
  }

  // FUNCIÓN CORREGIDA
  printMovement(): void {
    const fromEntity = this.entities.find(e => e.id === this.movementData.from_entity_id);
    const toEntity = this.entities.find(e => e.id === this.movementData.to_entity_id);

    const receiptData = {
      ...this.movementData,
      from_entity_name: fromEntity ? fromEntity.name : 'Externo',
      to_entity_name: toEntity ? toEntity.name : 'Externo',
      user: this.authService.getCurrentUser(),
      movement_date: new Date()
    };
    
    window.electronAPI.send('print-asset-movement', receiptData);
  }
}