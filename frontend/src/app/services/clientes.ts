// src/app/services/clientes.ts
import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

const BASE = `${environment.apiUrl}/clientes`;

@Injectable({ providedIn: 'root' })
export class ClientesService {
  
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

}
