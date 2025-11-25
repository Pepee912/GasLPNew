// src/app/services/tipo-servicio.ts

import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/tipo-servicios`;

@Injectable({ providedIn: 'root' })
export class TipoServiciosService {

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Listar tipos de servicio (paginado)
   * - Soporta filtros y paginación via params
   * - Devuelve { data, meta }
   */
  async list(params: any = {}) {
    const res = await axios.get(BASE, {
      params: {
        // valores por defecto
        'pagination[page]': 1,
        'pagination[pageSize]': 20,
        'sort[0]': 'nombre:asc',
        'filters[estado][$eq]': true,
        'populate[servicios]': true,
        ...params,
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    return res.data; // { data, meta }
  }

  /**
   * Crear un tipo de servicio
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
   * Actualizar por documentId
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
   * Desactivar (soft delete) => estado = false
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
}
