import { TestBed } from '@angular/core/testing';

import { ReceptionsService } from './receptions.service';

describe('Receptions', () => {
  let service: ReceptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReceptionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
