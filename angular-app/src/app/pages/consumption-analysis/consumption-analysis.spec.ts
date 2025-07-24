import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsumptionAnalysisComponent } from './consumption-analysis.component';

describe('ConsumptionAnalysis', () => {
  let component: ConsumptionAnalysisComponent;
  let fixture: ComponentFixture<ConsumptionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsumptionAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsumptionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
