import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';   
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth-service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false,
})
export class ResetPasswordPage implements OnInit {

  code: string = '';
  password: string = '';
  passwordConfirmation: string = '';

  constructor(
    private api: AuthService,
    private act: ActivatedRoute,
    private alert: AlertController,
    private router: Router            
  ) {
    this.code = this.act.snapshot.paramMap.get('code') as string;
  }

  ngOnInit() {}

  async resetPassword() {
    try {
      const res = await this.api.reset(this.code, this.password, this.passwordConfirmation);
      console.log(res);

      const successAlert = await this.alert.create({
        header: 'Éxito',
        subHeader: '',
        message: 'Tu contraseña ha sido cambiada correctamente.',
        mode: 'ios',
        buttons: [
          {
            text: 'Ir a iniciar sesión',
            handler: () => {
              // Redirigir al login
              this.router.navigateByUrl('/login');
            }
          }
        ]
      });

      await successAlert.present();

    } catch (error: any) {
      // Manejo de errores como ya lo tenías
      if (error.response?.data?.error?.message === 'Incorrect code provided') {
        this.presentAlert('Error', 'Código inválido', 'Verifica el enlace que te enviamos por correo');
        return;
      }
      if (error.response?.data?.error?.message === 'code is required field') {
        this.presentAlert('Error', 'Código requerido', 'Verifica el enlace que te enviamos por correo');
        return;
      }
      if (error.code === 'ERR_NETWORK') {
        this.presentAlert('Error', 'No se puede conectar al servidor', 'Intenta más tarde');
        return;
      }
      if (error.code === 'ERR_BAD_REQUEST') {
        this.presentAlert('Error', '', 'Verifica tus contraseñas');
        return;
      }

      this.presentAlert('Error', '', 'Ocurrió un error al cambiar la contraseña.');
    }
  }

  async presentAlert(header: string, subHeader: string, message: string) {
    const alert = await this.alert.create({
      header,
      subHeader,
      message,
      buttons: ['Aceptar'],
      mode: 'ios',
    });

    await alert.present();
  }

}
