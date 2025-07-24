import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-asset-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-inventory.component.html',
})
export class AssetInventoryComponent implements OnInit {
  rawInventory: any[] = [];
  pivotedInventory: any[] = [];
  collegeHeaders: string[] = [];
  searchTerm: string = '';

  constructor(
    private assetsService: AssetsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.assetsService.getInventory().subscribe(data => {
      this.rawInventory = data;
      this.processInventoryData();
      this.cdr.detectChanges();
    });
  }

  processInventoryData(): void {
    let filteredItems = this.rawInventory;
    if (this.searchTerm.trim() !== '') {
      filteredItems = this.rawInventory.filter(item =>
        item.asset_name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    const uniqueColleges = [...new Set(filteredItems.map(item => item.entity_name))];
    this.collegeHeaders = uniqueColleges.sort();

    const groupedByAsset = filteredItems.reduce((acc, item) => {
      acc[item.asset_name] = acc[item.asset_name] || {};
      acc[item.asset_name][item.entity_name] = item.quantity;
      return acc;
    }, {});

    this.pivotedInventory = Object.keys(groupedByAsset).map(assetName => {
      return {
        assetName: assetName,
        stocksByCollege: groupedByAsset[assetName]
      };
    });
  }

  onSearchChange(): void {
    this.processInventoryData();
  }
}