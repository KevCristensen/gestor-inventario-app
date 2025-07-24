import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetsService } from '../../services/assets.service';
import { AssetFormComponent } from '../../components/asset-form/asset-form.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, AssetFormComponent],
  templateUrl: './assets.component.html',
})
export class AssetsComponent implements OnInit {
  assets: any[] = [];
  isModalOpen = false;
  currentAsset: any = {};

  constructor(
    private assetsService: AssetsService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.assetsService.getAssets().subscribe(data => {
      this.assets = data;
      this.cdr.detectChanges();
    });
  }

  openModal(asset?: any): void {
    this.currentAsset = asset ? { ...asset } : {};
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveAsset(asset: any): void {
    const operation = asset.id
      ? this.assetsService.updateAsset(asset.id, asset)
      : this.assetsService.createAsset(asset);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Activo "${asset.name}" guardado.`);
        this.closeModal();
        this.loadAssets();
      },
      error: (err) => this.notificationService.showError('Error al guardar el activo.')
    });
  }

  deleteAsset(asset: any): void {
    if (confirm(`¿Estás seguro de que quieres eliminar "${asset.name}"?`)) {
      this.assetsService.deleteAsset(asset.id).subscribe({
        next: () => {
          this.notificationService.showSuccess(`Activo "${asset.name}" eliminado.`);
          this.loadAssets();
        },
        error: (err) => this.notificationService.showError('Error al eliminar el activo.')
      });
    }
  }
}