import { TestBed } from '@angular/core/testing';

import { Rutas } from './rutas';

describe('Rutas', () => {
  let service: Rutas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rutas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
