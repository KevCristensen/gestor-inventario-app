import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductLookupComponent } from './product-lookup.component';

describe('ProductLookup', () => {
  let component: ProductLookupComponent;
  let fixture: ComponentFixture<ProductLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductLookupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductLookupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
