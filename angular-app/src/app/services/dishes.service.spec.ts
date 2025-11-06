import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DishesService } from './dishes.service';

describe('DishesService', () => {
  let service: DishesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DishesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
