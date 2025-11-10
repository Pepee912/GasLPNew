import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClienteEditarPage } from './cliente-editar.page';

const routes: Routes = [
  {
    path: '',
    component: ClienteEditarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClienteEditarPageRoutingModule {}
