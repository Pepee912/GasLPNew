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
      { headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() } }
    );
    return res.data;
  }

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
    const res = await axios.get(`${environment.apiUrl}/serviciosbyruta/${rutaDocumentId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    return res.data;
  }
}
