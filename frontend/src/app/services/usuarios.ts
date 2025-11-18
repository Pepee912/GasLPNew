// src/app/services/usuarios.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod'; // o environment.ts si lo prefieres

// En Strapi v4, si apiUrl = 'http://localhost:1337/api'
// entonces BASE_USERS = 'http://localhost:1337/api/users'
const BASE_USERS = `${environment.apiUrl}/users`;
const BASE_ROLES = `${environment.apiUrl}/users-permissions/roles`;

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  /**
   * Listar usuarios con rol y personal.
   */
  async list(params: any = {}) {
    const res = await axios.get(BASE_USERS, {
      params: {
        'populate[role]': true,
        'populate[personal]': true,
        ...params,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    // Para /users Strapi devuelve un array "plano"
    return res.data;
  }

  /**
   * Obtener un usuario por id.
   */
  async findOne(id: number) {
    const res = await axios.get(`${BASE_USERS}/${id}`, {
      params: {
        'populate[role]': true,
        'populate[personal]': true,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    return res.data;
  }

  /**
   * Listar roles: Administrador, Callcenter, Operador, Authenticated, etc.
   */
  async listRoles() {
    const res = await axios.get(BASE_ROLES, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    // En Strapi suele venir como { roles: [...] }
    return res.data.roles || res.data;
  }

  /**
   * Actualizar el rol de un usuario.
   */
  async updateRole(userId: number, roleId: number) {
    const res = await axios.put(
      `${BASE_USERS}/${userId}`,
      {
        role: roleId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      }
    );

    return res.data;
  }

  /**
   * Actualizar datos generales del usuario.
   */
  async update(userId: number, data: any) {
    const res = await axios.put(
      `${BASE_USERS}/${userId}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      }
    );

    return res.data;
  }

  /**
   * Bloquear usuario (blocked = true).
   */
  async block(userId: number) {
    return this.update(userId, { blocked: true });
  }

  /**
   * Desbloquear usuario (blocked = false).
   */
  async unblock(userId: number) {
    return this.update(userId, { blocked: false });
  }
}
