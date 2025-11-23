import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardRutaPageRoutingModule } from './dashboard-ruta-routing.module';

import { DashboardRutaPage } from './dashboard-ruta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardRutaPageRoutingModule,
    ReactiveFormsModule,
  ],
  declarations: [DashboardRutaPage]
})
export class DashboardRutaPageModule {}
