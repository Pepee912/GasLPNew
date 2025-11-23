import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardRutaPage } from './dashboard-ruta.page';

describe('DashboardRutaPage', () => {
  let component: DashboardRutaPage;
  let fixture: ComponentFixture<DashboardRutaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardRutaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
