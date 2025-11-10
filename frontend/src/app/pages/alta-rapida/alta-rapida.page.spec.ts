import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AltaRapidaPage } from './alta-rapida.page';

describe('AltaRapidaPage', () => {
  let component: AltaRapidaPage;
  let fixture: ComponentFixture<AltaRapidaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AltaRapidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
