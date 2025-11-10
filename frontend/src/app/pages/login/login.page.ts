import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service';
import Axios from 'axios';
import { AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {

  access_token: string = "";

  constructor(private api: AuthService, private alert: AlertController, private act: ActivatedRoute, private router: Router) {
    console.log(this.act.snapshot.queryParams);

    this.access_token = this.act.snapshot.queryParams['access_token'];
    console.log(this.access_token);
  }
  identifier: string = "callcenter"
  password: string = "12345678"

  ngOnInit() {
    console.log("Cargando");
    if (this.access_token) {
      this.loginGoogle();
    }
  }

  async loginGoogle() {
    try {
      const res = await this.api.loginGoogle(this.access_token);
      console.log(res);
      this.saveToken(res);
    } catch (error: any) {
      this.presentAlert('Error', 'No se pudo iniciar sesión con Google', 'Intentalo más tarde')
      console.log(error);
      return
    }
  }

  async login() {
    try {
      const res = await this.api.login(this.identifier, this.password)
      console.log(res);
      this.saveToken(res);
    } catch (error: any) {
      console.log(error.code);
      if (error.code === 'ERR_BAD_REQUEST') {
        this.presentAlert('Error', 'Credenciales invalidas', 'Verifica tus datos')
        return
      }
      if (error.code == 'ERR_NETWORK') {
        this.presentAlert('Error', 'No se puede conectar con el servidor', 'Intentalo más tarde')
        return
      }
    }
  }

  async saveToken(data: any) {
    try {
      localStorage.setItem('token', data.data.jwt);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      this.presentAlert('Éxito', 'Sesión iniciada', 'Bienvenido ' + data.data.user.username)
      setTimeout(() => {
        this.router.navigateByUrl('/dashboard');
      }, 2000);
    } catch (error) {
      console.log(error);
      this.presentAlert('Error', 'No se pudo guardar la sesión', 'Intentalo más tarde')
    }
  }

  async presentAlert(header: string, subHeader: string, message: string) {
    const alert = await this.alert.create({
      header: header,
      subHeader: subHeader,
      message: message,
      buttons: ['Aceptar'],
      mode: 'ios',
    });

    await alert.present();
  }

}
