import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; 

  async login(identifier: string, password: string) {
    const res = await axios.post(`${this.apiUrl}/auth/local`, {
      identifier,
      password
    });

    const jwt  = res.data.jwt;
    const user = res.data.user; // user "simple" sin rol

    // 2) Pedir el usuario completo con su rol
    const meRes = await axios.get(`${this.apiUrl}/users/me?populate=role`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    const userWithRole = meRes.data; 

    // 3) Devolver en el formato que espera tu saveToken (data.data.jwt, data.data.user)
    return {
      data: {
        jwt,
        user: userWithRole,
      },
    };
  }

  // OLVIDÉ MI CONTRASEÑA
  async forgot(email: string) {
    return axios.post(`${this.apiUrl}/auth/forgot-password`, {
      email
    });
  }

  // RESETEAR CONTRASEÑA
  async reset(code: string, password: string, passwordConfirmation: string) {
    return axios.post(`${this.apiUrl}/auth/reset-password`, {
      code,
      password,
      passwordConfirmation
    });
  }

  // LOGIN CON GOOGLE
  async loginGoogle(access_token: string) {
    const res = await axios.get(`${this.apiUrl}/auth/google/callback?access_token=${access_token}`);

    const jwt  = res.data.jwt;
    const user = res.data.user;

    const meRes = await axios.get(`${this.apiUrl}/users/me?populate=role`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    const userWithRole = meRes.data;

    return {
      data: {
        jwt,
        user: userWithRole,
      },
    };
  }
}
