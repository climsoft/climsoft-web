import { TestBed } from '@angular/core/testing';

import { MockdataServiceService } from './mockdata.service.service';

describe('MockdataServiceService', () => {
  let service: MockdataServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockdataServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
