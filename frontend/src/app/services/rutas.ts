// src/app/services/rutas.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/rutas`;

export interface Ruta {
  id: number;
  documentId: string;
  nombre: string;
  estado: boolean;
  servicios?: any[];
  personals?: any[];
}

@Injectable({ providedIn: 'root' })
export class RutasService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Listar rutas ACTIVAS (una sola página)
   * -> la dejamos por si la usas en otros lados
   */
  async list(params?: any) {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': true,
        'pagination[page]': 1,
        'pagination[pageSize]': 25,
        'sort[0]': 'nombre:asc',
        ...(params || {}),
      },
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  /**
   * Listar rutas INACTIVAS (una sola página)
   */
  async listInactivas(params?: any) {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': false,
        'pagination[page]': 1,
        'pagination[pageSize]': 25,
        'sort[0]': 'nombre:asc',
        ...(params || {}),
      },
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  // ========== NUEVO: listar una página con meta (para dashboard) ==========

  async listPaged(params?: any) {
    const res = await axios.get(BASE, {
      params: {
        'pagination[page]': 1,
        'pagination[pageSize]': 20,
        'sort[0]': 'nombre:asc',
        ...(params || {}),
      },
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    // Strapi v4/v5: { data, meta }
    return res.data;
  }

  // ========== YA TENÍAS: traer TODAS las rutas activas/inactivas ==========

  private async listAllByEstado(
    estado: boolean,
    params?: any,
    pageSize: number = 50
  ) {
    let page = 1;
    let allData: any[] = [];
    let finalMeta: any = null;

    while (true) {
      const res = await axios.get(BASE, {
        params: {
          'filters[estado][$eq]': estado,
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
          'sort[0]': 'nombre:asc',
          ...(params || {}),
        },
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const dataPage = res.data?.data ?? [];
      const meta = res.data?.meta ?? null;
      allData = allData.concat(dataPage);
      finalMeta = meta || finalMeta;

      const pagination = meta?.pagination;
      if (!pagination || page >= pagination.pageCount) {
        break;
      }

      page++;
    }

    return {
      data: allData,
      meta: finalMeta,
    };
  }

  async listAllActivas(params?: any) {
    return this.listAllByEstado(true, params, 50);
  }

  async listAllInactivas(params?: any) {
    return this.listAllByEstado(false, params, 50);
  }

  // ======================================================

  async getByDocumentId(documentId: string) {
    const res = await axios.get(`${BASE}/${documentId}`, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  async create(data: { nombre: string }) {
    const res = await axios.post(
      BASE,
      {
        data: {
          nombre: data.nombre,
          estado: true,
        },
      },
      {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      }
    );
    return res.data;
  }

  async update(documentId: string, data: { nombre?: string; estado?: boolean }) {
    const res = await axios.put(
      `${BASE}/${documentId}`,
      { data },
      {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      }
    );
    return res.data;
  }

  async softDelete(documentId: string) {
    return this.update(documentId, { estado: false });
  }
}
