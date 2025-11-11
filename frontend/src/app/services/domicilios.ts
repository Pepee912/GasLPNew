// src/app/services/domicilios.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/domicilios`;

@Injectable({ providedIn: 'root' })
export class DomiciliosService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async create(data: any) {
    const res = await axios.post(
      BASE,
      { data },
      { headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() } }
    );
    return res.data;
  }

  async listByCliente(cliente: any | string | number) {
    let value: string | number | undefined;
    let field: 'id' | 'documentId' = 'documentId';

    if (typeof cliente === 'object' && cliente) {
      const flat = { ...cliente, ...(cliente.attributes || {}) };

      if (flat.documentId) {
        value = flat.documentId;
        field = 'documentId';
      } else {
        value = flat.id;
        field = 'id';
      }
    } else {
      value = cliente as string | number;
      field = 'documentId';
    }

    if (value === undefined || value === null) {
      return { data: [], meta: {} };
    }

    const res = await axios.get(BASE, {
      params: {
        [`filters[cliente][${field}][$eq]`]: value,
        'pagination[pageSize]': 100,
      },
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });

    return res.data; // { data: [...], meta: {...} }
  }

  // 👇 NUEVO: actualizar domicilio (por id o documentId según cómo tengas tu endpoint)
  async update(idOrDocumentId: string | number, data: any) {
    const res = await axios.put(
      `${BASE}/${idOrDocumentId}`,
      { data },
      { headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() } }
    );
    return res.data;
  }
}
