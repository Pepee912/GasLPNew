import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardUsuariosPageRoutingModule } from './dashboard-usuarios-routing.module';

import { DashboardUsuariosPage } from './dashboard-usuarios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardUsuariosPageRoutingModule
  ],
  declarations: [DashboardUsuariosPage]
})
export class DashboardUsuariosPageModule {}
