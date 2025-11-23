import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guard/auth-guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'forgot',
    loadChildren: () => import('./pages/login/forgot/forgot.module').then( m => m.ForgotPageModule)
  },
  {
    path: 'reset/:code',
    loadChildren: () => import('./pages/login/reset-password/reset-password.module').then( m => m.ResetPasswordPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'clientes',
    loadChildren: () => import('./pages/clientes/clientes.module').then( m => m.ClientesPageModule)
  },
  {
    path: 'clientes/editar/:documentId',
    loadChildren: () => import('./pages/cliente-editar/cliente-editar.module').then( m => m.ClienteEditarPageModule)
  },
  {
    path: 'callcenter/alta-rapida',
    loadChildren: () => import('./pages/alta-rapida/alta-rapida.module').then( m => m.AltaRapidaPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard-usuarios',
    loadChildren: () => import('./pages/usuarios/dashboard-usuarios/dashboard-usuarios.module').then( m => m.DashboardUsuariosPageModule)
  },
  {
    path: 'dashboard-servicios',
    loadChildren: () => import('./pages/servicios/dashboard-servicios/dashboard-servicios.module').then( m => m.DashboardServiciosPageModule)
  },
  {
    path: 'dashboard-ruta',
    loadChildren: () => import('./pages/rutas/dashboard-ruta/dashboard-ruta.module').then( m => m.DashboardRutaPageModule)
  },
  {
    path: 'tipo-servicio',
    loadChildren: () => import('./pages/tipo-servicio/tipo-servicio/tipo-servicio.module').then( m => m.TipoServicioPageModule)
  },
  {
    path: 'estado-servicio',
    loadChildren: () => import('./pages/estado-servicio/estado-servicio/estado-servicio.module').then( m => m.EstadoServicioPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
