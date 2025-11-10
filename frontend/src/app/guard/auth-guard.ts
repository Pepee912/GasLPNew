import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod';

export const authGuard: CanActivateFn = async (route, state) => {

  let url = environment.apiUrl;

  const token = localStorage.getItem('token');
  const router = inject(Router);

  if (!token) {
    window.alert('Acceso denegado. Por favor, inicie sesión.');
    router.navigate(['/login']);
    return false;
  } else {
    try {
      const user = await axios.get(url + '/users/me?populate=*', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const allowedRoles = ['callcenter', 'administrador', 'operador'];

      const userRole = user.data.role.type;

      if (!allowedRoles.includes(userRole)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // (Opcional) Limpia también el rol si lo estabas guardando
        localStorage.removeItem('userRole');
        window.alert('Acceso denegado. No tiene permisos suficientes.');
        router.navigate(['/login']);
        return false;
      }

      localStorage.setItem('userRole', userRole);

      return true;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole'); 
      window.alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
      router.navigate(['/login']);
      return false;
    }
  }

};