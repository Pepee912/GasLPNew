import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardRutaPage } from './dashboard-ruta.page';

const routes: Routes = [
  {
    path: '',
    component: DashboardRutaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRutaPageRoutingModule {}
