import { TestBed } from '@angular/core/testing';

import { Domicilios } from './domicilios';

describe('Domicilios', () => {
  let service: Domicilios;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Domicilios);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
