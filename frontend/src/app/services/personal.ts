// src/app/services/personal.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod'; // o environment

// Si el tipo en Strapi es api::personal.personal, el endpoint REST será /personals
const BASE_PERSONAL = `${environment.apiUrl}/personals`;

@Injectable({
  providedIn: 'root'
})
export class PersonalService {

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  /**
   * Crear un registro de personal a partir de un usuario.
   */
  async createFromUser(
    user: any,
    extra?: {
      nombre?: string;
      apellidos?: string;
      telefono?: string;
      rutaId?: number | null;
    }
  ) {
    const payload = {
      data: {
        nombre: extra?.nombre ?? user.username ?? '',
        apellidos: extra?.apellidos ?? '',
        telefono: extra?.telefono ?? '',
        ruta: extra?.rutaId ?? null,
        users_permissions_user: user.id,
      },
    };

    const res = await axios.post(
      BASE_PERSONAL,
      payload,
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
   * Actualizar un registro de personal (por ejemplo para asignar ruta).
   */
  async update(personalId: number, data: any) {
    const res = await axios.put(
      `${BASE_PERSONAL}/${personalId}`,
      { data },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      }
    );

    return res.data;
  }
}
