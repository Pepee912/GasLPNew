import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AltaRapidaPage } from './alta-rapida.page';

const routes: Routes = [
  {
    path: '',
    component: AltaRapidaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AltaRapidaPageRoutingModule {}
