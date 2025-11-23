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

  private unwrapCollection(res: any) {
    const raw = res?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }

  /**
   * Listar estados de servicio (con servicios asociados)
   * Puedes pasar filtros extra en params, por ejemplo:
   *   { 'filters[estado][$eq]': true }  // solo activos
   */
  async list(params: any = {}) {
    const res = await axios.get(BASE, {
      params: {
        'pagination[pageSize]': 100,
        'sort[0]': 'tipo:asc',
        'populate[servicios]': true,   // 🔹 importante para contar servicios asociados
        ...params,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    return this.unwrapCollection(res);
  }

  /**
   * Obtener solo los estados activos (estado = true) ordenados por tipo
   */
  async listActivos() {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': true,
        'sort[0]': 'tipo:asc',
        'populate[servicios]': true,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    return this.unwrapCollection(res);
  }

  /**
   * Obtener un estado por su "tipo" (ej: 'Cancelado', 'Asignado', 'Surtido')
   * Se mantiene igual para no romper la lógica donde lo uses.
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

    const items = this.unwrapCollection(res);
    return items[0] || null;
  }

  /**
   * Crear un nuevo estado de servicio
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
   * Actualizar un estado de servicio por documentId
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
   * Soft delete: desactivar => estado = false
   */
  async desactivar(documentId: string) {
    return this.update(documentId, { estado: false });
  }

  /**
   * Reactivar => estado = true
   */
  async reactivar(documentId: string) {
    return this.update(documentId, { estado: true });
  }

  /**
   * DELETE definitivo (no recomendado en tu caso, pero lo dejo por si lo requieres en otro contexto)
   */
  async delete(documentId: string) {
    const res = await axios.delete(`${BASE}/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    return res.data;
  }
}
