import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LossDamageReportComponent } from './loss-damage-report.component';

describe('LossDamageReport', () => {
  let component: LossDamageReportComponent;
  let fixture: ComponentFixture<LossDamageReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LossDamageReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LossDamageReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
