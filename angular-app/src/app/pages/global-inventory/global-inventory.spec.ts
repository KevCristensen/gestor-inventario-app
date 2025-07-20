import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalInventoryComponent } from './global-inventory.component';

describe('GlobalInventory', () => {
  let component: GlobalInventoryComponent;
  let fixture: ComponentFixture<GlobalInventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalInventoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
