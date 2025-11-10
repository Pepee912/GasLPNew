import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardServiciosPage } from './dashboard-servicios.page';

describe('DashboardServiciosPage', () => {
  let component: DashboardServiciosPage;
  let fixture: ComponentFixture<DashboardServiciosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardServiciosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
