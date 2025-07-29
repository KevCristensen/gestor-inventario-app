import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetMovementsService } from '../../services/asset-movements.service';
import { AssetsService } from '../../services/assets.service';
import { EntitiesService } from '../../services/entities.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-asset-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-movements.component.html',
})
export class AssetMovementsComponent implements OnInit {
  movements: any[] = [];
  allAssets: any[] = []; // Lista completa de activos para el catálogo
  availableAssets: any[] = []; // Lista de activos CON STOCK en la bodega origen
  entities: any[] = [];
  currentUserEntityId: number | null = null;
  isSaving = false;
  
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
    
    // Añade esta línea para configurar el formulario al inicio
    this.onMovementTypeChange(); 
  }

  loadInitialData(): void {
    this.assetMovementsService.getMovements().subscribe(data => {
      this.movements = data;
      this.cdr.detectChanges();
    });
    this.assetsService.getAssets().subscribe(data => this.allAssets = data);
    this.entitiesService.getEntities().subscribe(data => this.entities = data);
  }

  onMovementTypeChange(): void {
    // Limpia las selecciones anteriores para evitar errores
    this.movementData.from_entity_id = null;
    this.movementData.to_entity_id = null;
    this.movementData.event_details = '';
    this.availableAssets = [];
    this.itemToAdd.asset_id = null;
    this.movementData.items = []; // <-- 1. AÑADE ESTA LÍNEA
  }


  onOriginChange(entityId: number | null): void {
    this.availableAssets = [];
    this.itemToAdd.asset_id = null;
    this.movementData.items = []; // <-- 2. AÑADE ESTA LÍNEA
    if (entityId) {
      // Carga solo los activos que tienen stock en la bodega seleccionada
      this.assetsService.getAssetsByEntity(entityId).subscribe(data => {
        this.availableAssets = data;
      });
    }
  }

  addItem(): void {
    if (!this.itemToAdd.asset_id || !this.itemToAdd.quantity) {
      this.notificationService.showError('Seleccione un activo y una cantidad.');
      return;
    }
    
    // 1. Cambia 'this.assets' por 'this.allAssets'
    // 2. Añade el tipo (a: any)
    const asset = this.allAssets.find((a: any) => a.id == this.itemToAdd.asset_id);

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
    const payload = {
      ...this.movementData,
      user_id: currentUser.id
    };
    if (payload.type === 'salida_evento') payload.to_entity_id = null;
    if (payload.type === 'retorno_evento') payload.from_entity_id = null;
    if (payload.type === 'baja') payload.to_entity_id = null;
    if (payload.type === 'entrada_inicial') payload.from_entity_id = null;
    this.isSaving = true;
    
    this.assetMovementsService.createMovement(payload).pipe(
      finalize(() => this.isSaving = false) // <-- Desbloquea al finalizar
    ).subscribe({
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
    const fromEntity = this.entities.find(e => e.id == this.movementData.from_entity_id);
    const toEntity = this.entities.find(e => e.id == this.movementData.to_entity_id);

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