import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Importa ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { ProvidersService } from '../../services/providers.service';
import { ProviderFormComponent } from '../../components/provider-form/provider-form.component'; // Importa el form

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [CommonModule, ProviderFormComponent], // Asegúrate de importar el form
  templateUrl: './providers.component.html',
})
export class ProvidersComponent implements OnInit {
  providers: any[] = [];
  isModalOpen = false;
  currentProvider: any = {};

  // Propiedades para la paginación
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;

  constructor(
    private providersService: ProvidersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.providersService.getProviders(this.currentPage, this.itemsPerPage).subscribe({
      next: (response) => {
        this.providers = response.data;
        this.totalItems = response.total;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar proveedores:', err)
    });
  }

  // Métodos para cambiar de página
  goToPage(page: number): void {
    this.currentPage = page;
    this.loadProviders();
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  openModal(provider?: any): void {
    this.currentProvider = provider ? { ...provider } : { name: '', rut: '', contact_person: '', phone: '', email: '' };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveProvider(provider: any): void {
    const operation = provider.id
      ? this.providersService.updateProvider(provider.id, provider)
      : this.providersService.createProvider(provider);

    operation.subscribe({
      next: () => {
        this.closeModal();    // <-- 1. CIERRA EL MODAL PRIMERO
        this.loadProviders(); // <-- 2. LUEGO RECARGA LA LISTA
      },
      error: (err) => console.error('Error al guardar proveedor:', err)
    });
  }

  deleteProvider(providerId: number): void {
    // Usamos una confirmación nativa del navegador
    const confirmation = confirm('¿Estás seguro de que quieres eliminar este proveedor?');

    if (confirmation) {
      this.providersService.deleteProvider(providerId).subscribe({
        next: () => {
          this.loadProviders(); // Recarga la lista para que el proveedor desaparezca
        },
        error: (err) => console.error('Error al eliminar proveedor:', err)
      });
    }
  }
}