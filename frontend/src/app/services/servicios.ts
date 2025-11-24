// src/app/services/servicios.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/servicios`;

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

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

  // Sigue funcionando tu endpoint específico /servicios/hoy
  async getHoy() {
    const res = await axios.get(`${BASE}/hoy`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    return res.data;
  }

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

  async getByRuta(rutaDocumentId: string) {
    const res = await axios.get(
      `${environment.apiUrl}/serviciosbyruta/${rutaDocumentId}`,
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
   * list:
   *  - options.page        → pagination[page]
   *  - options.pageSize    → pagination[pageSize]
   *  - el resto de props se envía tal cual (sort[0], dia, fecha, estado, tipo, rutaDocumentId, etc.)
   */
  async list(options: any = {}) {
    const params: any = { ...options };

    if (options.page !== undefined) {
      params['pagination[page]'] = options.page;
      delete params.page;
    }

    if (options.pageSize !== undefined) {
      params['pagination[pageSize]'] = options.pageSize;
      delete params.pageSize;
    }

    const res = await axios.get(BASE, {
      params,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    // Strapi v5 → { data, meta }
    return res.data;
  }
}
