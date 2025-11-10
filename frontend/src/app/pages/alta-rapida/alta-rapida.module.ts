// src/app/pages/alta-rapida/alta-rapida.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AltaRapidaPage } from './alta-rapida.page';

const routes: Routes = [{ path: '', component: AltaRapidaPage }];

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AltaRapidaPage],
})
export class AltaRapidaPageModule {}
