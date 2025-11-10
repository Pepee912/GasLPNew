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

      // console.log('role.name:', roleName);
      // console.log('role.type:', roleType);
      // console.log('Rol normalizado para lógica:', rawRole);

      this.userRoleLabel = this.user.role?.name || 'Usuario';

      // Permisos según rol
      this.setPermissions(rawRole);

      console.log('Permisos:', {
        clientes: this.canViewClientes,
        usuarios: this.canViewUsuarios,
        servicios: this.canViewServicios,
      });

    } catch (err) {
      console.error('Error parseando user de localStorage', err);
    }
  }

  private setPermissions(rawRole: string) {
    const role = rawRole.trim().toLowerCase();

    // Administrador
    if (role === 'administrador' || role === 'admin') {
      this.canViewClientes  = true;
      this.canViewUsuarios  = true;
      this.canViewServicios = true;
      return;
    }

    // Callcenter
    if (role === 'callcenter' || role === 'call center') {
      this.canViewClientes  = true;
      this.canViewServicios = true;
      return;
    }

    // Operador
    if (role === 'operador' || role === 'operator' || role === 'operario') {
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

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }
}
