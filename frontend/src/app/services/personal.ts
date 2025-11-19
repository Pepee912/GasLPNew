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

  /**
   * Crea un registro de personal a partir de un usuario.
   * rutaId = documentId de la ruta (string) o null.
   */
  async createFromUser(
    user: any,
    extra?: {
      nombre?: string;
      apellidos?: string;
      telefono?: string;
      rutaId?: string | null;  
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
   * Actualizar personal existente.
   */
  async update(personalDocumentId: string, data: {
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    ruta?: string | null;   // documentId de ruta o null
  }) {
    const payload = { data };

    const res = await axios.put(
      `${BASE_PERSONAL}/${personalDocumentId}`,   
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
   * Eliminar personal por documentId.
   */
  async delete(personalDocumentId: string) {
    const res = await axios.delete(
      `${BASE_PERSONAL}/${personalDocumentId}`,  
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
