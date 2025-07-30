import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { LayoutComponent } from './components/layout/layout.component'; 
import { ProvidersComponent } from './pages/providers/providers.component'; 
import { ProductsComponent } from './pages/products/products.component'; 
import { InventoryReceptionComponent } from './pages/inventory-reception/inventory-reception.component';
import { InventoryExitComponent } from './pages/inventory-exit/inventory-exit.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { GlobalInventoryComponent } from './pages/global-inventory/global-inventory.component';
import { ConsumptionAnalysisComponent } from './pages/consumption-analysis/consumption-analysis.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { AssetMovementsComponent } from './pages/asset-movements/asset-movements.component';
import { AssetInventoryComponent } from './pages/asset-inventory/asset-inventory.component';
import { ProductLookupComponent } from './pages/product-lookup/product-lookup.component';
import { LossDamageReportComponent } from './pages/loss-damage-report/loss-damage-report.component';
import { ChatComponent } from './pages/chat/chat.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { 
        path: 'dashboard', 
        component: LayoutComponent, // 2. La ruta principal ahora carga el Layout
        canActivate: [authGuard],
        children: [ // 3. Las páginas internas son "hijas" del layout
            { path: '', component: DashboardComponent }, // La ruta vacía (/dashboard) muestra el Dashboard
            { path: 'providers', component: ProvidersComponent }, 
            { path: 'products', component: ProductsComponent }, 
            { path: 'reception', component: InventoryReceptionComponent }, 
            { path: 'exit', component: InventoryExitComponent },
            { path: 'reports', component: ReportsComponent },
            { path: 'global-inventory', component: GlobalInventoryComponent },
            { path: 'analysis', component: ConsumptionAnalysisComponent },
            { path: 'loss-damage-report', component: LossDamageReportComponent },
            { path: 'chat', component: ChatComponent }, 
            { path: 'assets', component: AssetsComponent },
            { path: 'asset-movements', component: AssetMovementsComponent },
            { path: 'asset-inventory', component: AssetInventoryComponent }, 
            { path: 'product-lookup', component: ProductLookupComponent },     
        ]
    },
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, 
    { path: '**', redirectTo: '/dashboard' }
];