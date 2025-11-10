import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClienteEditarPage } from './cliente-editar.page';

describe('ClienteEditarPage', () => {
  let component: ClienteEditarPage;
  let fixture: ComponentFixture<ClienteEditarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClienteEditarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
