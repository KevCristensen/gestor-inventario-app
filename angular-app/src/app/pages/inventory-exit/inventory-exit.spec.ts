import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryExitComponent } from './inventory-exit.component';

describe('InventoryExit', () => {
  let component: InventoryExitComponent;
  let fixture: ComponentFixture<InventoryExitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryExitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryExitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
