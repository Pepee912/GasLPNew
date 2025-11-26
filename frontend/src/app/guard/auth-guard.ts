// src/app/guard/auth-guard.ts
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod';

export const authGuard: CanActivateFn = async (route, state) => {
  const url = environment.apiUrl;
  const token = localStorage.getItem('token');
  const router = inject(Router);

  // 1) Sin token -> fuera
  if (!token) {
    window.alert('Acceso denegado. Por favor, inicie sesión.');
    router.navigate(['/login']);
    return false;
  }

  try {
    // 2) Obtener usuario desde Strapi
    const res = await axios.get(url + '/users/me?populate=role', {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    const user = res.data;
    // Tomamos el rol de Strapi
    // "Administrador", "CallCenter", "Operador"
    const rawRole: string =
      (user.role?.name || user.role?.type || '').toString();

    const userRole = rawRole.toLowerCase();

    // Guardar por si lo quieres usar en otros lados
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('user', JSON.stringify(user));

    // 3) Revisar si la ruta tiene restricción de roles
    const routeRoles = route.data?.['roles'] as string[] | undefined;

    if (routeRoles && routeRoles.length > 0) {
      const allowedRoles = routeRoles.map(r => r.toLowerCase());

      if (!allowedRoles.includes(userRole)) {
        window.alert('Acceso denegado. No tienes permisos para esta sección.');
        // Puedes mandarlo al dashboard o al login
        router.navigate(['/dashboard']);
        return false;
      }
    } else {
      // Si NO hay data.roles, puedes tener una lista genérica
      const allowedRoles = ['callcenter', 'administrador', 'operador'];
      if (!allowedRoles.includes(userRole)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        window.alert('Acceso denegado. No tiene permisos suficientes.');
        router.navigate(['/login']);
        return false;
      }
    }

    // 4) Todo bien, dejar pasar
    return true;

  } catch (error) {
    // Token inválido / sesión expirada
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    window.alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    router.navigate(['/login']);
    return false;
  }
};
