// src/app/services/personal.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment.prod'; 

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

  async update(personalId: number, data: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    ruta?: number | null;
  }) {
    const payload = { data };

    const res = await axios.put(
      `${BASE_PERSONAL}/${personalId}`,
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

  async delete(personalId: number) {
    const res = await axios.delete(
      `${BASE_PERSONAL}/${personalId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      }
    );
    return res.data;
  }

  async findByTelefono(telefono: string) {
    const res = await axios.get(BASE_PERSONAL, {
      params: {
        'filters[telefono][$eq]': telefono,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    const data = res.data.data ?? res.data;
    return data; 
  }


}
