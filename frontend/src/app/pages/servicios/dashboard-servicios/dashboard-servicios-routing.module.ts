import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardServiciosPage } from './dashboard-servicios.page';

const routes: Routes = [
  {
    path: '',
    component: DashboardServiciosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardServiciosPageRoutingModule {}
