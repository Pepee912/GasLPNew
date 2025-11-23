import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoServicioPage } from './estado-servicio.page';

describe('EstadoServicioPage', () => {
  let component: EstadoServicioPage;
  let fixture: ComponentFixture<EstadoServicioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadoServicioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
