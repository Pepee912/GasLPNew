import { TestBed } from '@angular/core/testing';

import { Personal } from './personal';

describe('Personal', () => {
  let service: Personal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Personal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
