import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetMovementsComponent } from './asset-movements.component';

describe('AssetMovements', () => {
  let component: AssetMovementsComponent;
  let fixture: ComponentFixture<AssetMovementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetMovementsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetMovementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
