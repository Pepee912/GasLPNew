import { TestBed } from '@angular/core/testing';

import { EstadoServicio } from './estado-servicio';

describe('EstadoServicio', () => {
  let service: EstadoServicio;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EstadoServicio);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
