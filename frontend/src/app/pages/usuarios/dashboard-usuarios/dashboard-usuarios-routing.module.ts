import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardUsuariosPage } from './dashboard-usuarios.page';

const routes: Routes = [
  {
    path: '',
    component: DashboardUsuariosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardUsuariosPageRoutingModule {}
