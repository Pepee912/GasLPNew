import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TipoServicioPageRoutingModule } from './tipo-servicio-routing.module';

import { TipoServicioPage } from './tipo-servicio.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TipoServicioPageRoutingModule,
    ReactiveFormsModule,
  ],
  declarations: [TipoServicioPage]
})
export class TipoServicioPageModule {}
