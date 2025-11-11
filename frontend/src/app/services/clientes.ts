import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';
import { DomiciliosService } from './domicilios';

const BASE = `${environment.apiUrl}/clientes`;

@Injectable({ providedIn: 'root' })
export class ClientesService {

  constructor(
    private domiciliosSrv: DomiciliosService
  ) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async list(params?: any) {
    const res = await axios.get(BASE, {
      params,
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  async create(data: any) {
    const res = await axios.post(
      BASE,
      { data },
      { headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() } }
    );
    return res.data;
  }

  async findByPhone(telefono: string) {
    const res = await axios.get(`${BASE}/telefono/${encodeURIComponent(telefono)}`, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  async getOne(documentId: string) {
    const res = await axios.get(`${BASE}/${documentId}`, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  async update(documentId: string, data: any) {
    const res = await axios.put(`${BASE}/${documentId}`, { data }, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  async delete(documentId: string) {
    const res = await axios.delete(`${BASE}/${documentId}`, {
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
    });
    return res.data;
  }

  // 🔻 SOFT DELETE: desactivar cliente + domicilios
  async deactivate(documentId: string) {
    // 1) Desactivar cliente
    await this.update(documentId, { estado: false });

    // 2) Desactivar domicilios asociados
    const domRes = await this.domiciliosSrv.listByCliente(documentId);
    const domList = domRes?.data ?? [];

    for (const d of domList) {
      const flat = { ...d, ...(d.attributes || {}) };
      const domDocId = flat.documentId || flat.id;
      if (domDocId) {
        await this.domiciliosSrv.update(domDocId, { estado: false });
      }
    }
  }

  // 🔺 REACTIVAR cliente + domicilios
  async reactivate(documentId: string) {
    // 1) Reactivar cliente
    await this.update(documentId, { estado: true });

    // 2) Reactivar domicilios asociados
    const domRes = await this.domiciliosSrv.listByCliente(documentId);
    const domList = domRes?.data ?? [];

    for (const d of domList) {
      const flat = { ...d, ...(d.attributes || {}) };
      const domDocId = flat.documentId || flat.id;
      if (domDocId) {
        await this.domiciliosSrv.update(domDocId, { estado: true });
      }
    }
  }
}
