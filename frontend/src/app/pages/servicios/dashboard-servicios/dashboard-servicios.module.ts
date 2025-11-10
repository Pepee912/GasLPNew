import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardServiciosPageRoutingModule } from './dashboard-servicios-routing.module';

import { DashboardServiciosPage } from './dashboard-servicios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardServiciosPageRoutingModule
  ],
  declarations: [DashboardServiciosPage]
})
export class DashboardServiciosPageModule {}
