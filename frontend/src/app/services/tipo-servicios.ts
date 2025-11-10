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
}
