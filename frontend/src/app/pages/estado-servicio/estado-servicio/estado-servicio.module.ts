import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EstadoServicioPageRoutingModule } from './estado-servicio-routing.module';

import { EstadoServicioPage } from './estado-servicio.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    EstadoServicioPageRoutingModule
  ],
  declarations: [EstadoServicioPage]
})
export class EstadoServicioPageModule {}
