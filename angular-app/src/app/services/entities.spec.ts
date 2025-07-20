import { TestBed } from '@angular/core/testing';

import { EntitiesService } from './entities.service';

describe('Entities', () => {
  let service: EntitiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntitiesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
