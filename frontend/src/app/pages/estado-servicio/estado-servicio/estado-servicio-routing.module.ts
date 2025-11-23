import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EstadoServicioPage } from './estado-servicio.page';

const routes: Routes = [
  {
    path: '',
    component: EstadoServicioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EstadoServicioPageRoutingModule {}
