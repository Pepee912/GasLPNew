import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardUsuariosPage } from './dashboard-usuarios.page';

describe('DashboardUsuariosPage', () => {
  let component: DashboardUsuariosPage;
  let fixture: ComponentFixture<DashboardUsuariosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardUsuariosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
