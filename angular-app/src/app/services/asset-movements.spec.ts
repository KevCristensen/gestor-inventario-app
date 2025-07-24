import { TestBed } from '@angular/core/testing';

import { AssetMovementsService } from './asset-movements.service';

describe('AssetMovements', () => {
  let service: AssetMovementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetMovementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
