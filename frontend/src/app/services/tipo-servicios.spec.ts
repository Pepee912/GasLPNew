import { TestBed } from '@angular/core/testing';

import { TipoServicios } from './tipo-servicios';

describe('TipoServicios', () => {
  let service: TipoServicios;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoServicios);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
