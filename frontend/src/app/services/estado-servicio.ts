// src/app/services/estado-servicio.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/estado-servicios`;

@Injectable({ providedIn: 'root' })
export class EstadoServicioService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async list(params: any = {}) {
    const res = await axios.get(BASE, {
      params,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    return res.data;
  }

  /**
   * Obtener solo los estados activos (estado = true) ordenados por tipo
   */
  async listActivos() {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': true,
        'sort[0]': 'tipo:asc',
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    return res.data;
  }

  /**
   * Obtener un estado por su "tipo" (ej: 'Pendiente', 'En ruta', 'Surtido')
   */
  async getByTipo(tipo: string) {
    const res = await axios.get(BASE, {
      params: {
        'filters[tipo][$eq]': tipo,
        'filters[estado][$eq]': true,
        'pagination[pageSize]': 1,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }

    return null;
  }

  /**
   * (Opcional) Crear un nuevo estado de servicio (por si lo manejas en un panel)
   */
  async create(data: any) {
    const res = await axios.post(
      BASE,
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

  /**
   * (Opcional) Actualizar un estado de servicio (activar/desactivar, cambiar nombre, etc.)
   */
  async update(documentId: string, data: any) {
    const res = await axios.put(
      `${BASE}/${documentId}`,
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

  /**
   * (Opcional) Eliminar un estado de servicio (si lo permites)
   */
  async delete(documentId: string) {
    const res = await axios.delete(
      `${BASE}/${documentId}`,
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
