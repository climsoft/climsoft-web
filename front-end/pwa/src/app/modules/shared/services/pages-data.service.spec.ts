import { TestBed } from '@angular/core/testing';

import { PagesDataService } from './pages-data.service';

describe('PagesDataService', () => {
  let service: PagesDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagesDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
