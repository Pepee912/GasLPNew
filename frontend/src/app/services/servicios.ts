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
      { headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() } }
    );
    return res.data;
  }
}
