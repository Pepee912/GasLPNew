import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TipoServicioPage } from './tipo-servicio.page';

describe('TipoServicioPage', () => {
  let component: TipoServicioPage;
  let fixture: ComponentFixture<TipoServicioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TipoServicioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
