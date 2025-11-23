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
   * Listar rutas ACTIVAS
   */
  async list(params?: any) {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': true,
        'pagination[pageSize]': 100,
        'sort[0]': 'nombre:asc',
        ...(params || {})
      },
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  /**
   * Listar rutas INACTIVAS
   */
  async listInactivas(params?: any) {
    const res = await axios.get(BASE, {
      params: {
        'filters[estado][$eq]': false,
        'pagination[pageSize]': 100,
        'sort[0]': 'nombre:asc',
        ...(params || {})
      },
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

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
