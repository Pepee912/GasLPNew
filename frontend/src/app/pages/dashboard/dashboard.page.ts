import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  user: any = null;

  userRoleLabel: string = '';

  // permisos de módulos
  canViewClientes  = false;
  canViewUsuarios  = false;
  canViewServicios = false;
  canViewRutas     = false;
  canViewTipoServicio = false;
  canViewEstadoServicio = false;

  constructor(private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      console.warn('No hay user en localStorage');
      return;
    }

    try {
      this.user = JSON.parse(userStr);

      console.log('Usuario completo:', this.user);

      const roleName = (this.user.role?.name || '').toString().toLowerCase();
      const roleType = (this.user.role?.type || '').toString().toLowerCase();

      const rawRole = roleType || roleName;

      this.userRoleLabel = this.user.role?.name || 'Usuario';

      // Permisos según rol
      this.setPermissions(rawRole);

    } catch (err) {
      console.error('Error parseando user de localStorage', err);
    }
  }

  private setPermissions(rawRole: string) {
    const role = rawRole.trim().toLowerCase();

    // Administrador
    if (role === 'administrador') {
      this.canViewClientes  = true;
      this.canViewUsuarios  = true;
      this.canViewServicios = true;
      this.canViewRutas     = true;
      this.canViewTipoServicio = true;
      this.canViewEstadoServicio = true;
      return;
    }

    // Callcenter
    if (role === 'callcenter') {
      this.canViewClientes  = true;
      this.canViewServicios = true;
      return;
    }

    // Operador
    if (role === 'operador') {
      this.canViewServicios = true;
      return;
    }

    // Rol desconocido por seguridad, no mostramos nada
    this.canViewClientes  = false;
    this.canViewUsuarios  = false;
    this.canViewServicios = false;
  }

  goClientes() {
    this.router.navigateByUrl('/clientes');
  }

  goUsuarios() {
    this.router.navigateByUrl('/dashboard-usuarios');
  }

  goServicios() {
    this.router.navigateByUrl('/dashboard-servicios');
  }

  goRutas() {
    this.router.navigateByUrl('/dashboard-ruta');
  }

  goTipoServicio() {
    this.router.navigateByUrl('/tipo-servicio');
  }

  goEstadoServicio() {
    this.router.navigateByUrl('/estado-servicio');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }
}
