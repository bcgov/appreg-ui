import { TestBed, inject } from '@angular/core/testing';

import { KqService } from './kq.service';

describe('KqService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KqService]
    });
  });

  it('should be created', inject([KqService], (service: KqService) => {
    expect(service).toBeTruthy();
  }));
});
