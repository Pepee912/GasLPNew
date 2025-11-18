// src/app/services/usuarios.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod'; 

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

    return res.data;
  }

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

  async listRoles() {
    const res = await axios.get(BASE_ROLES, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    return res.data.roles || res.data;
  }

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

  async block(userId: number) {
    return this.update(userId, { blocked: true });
  }

  async unblock(userId: number) {
    return this.update(userId, { blocked: false });
  }

  // crear usuario
  async create(data: any) {
    const res = await axios.post(
      BASE_USERS,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      }
    );

    return res.data; // user creado
  }

}
