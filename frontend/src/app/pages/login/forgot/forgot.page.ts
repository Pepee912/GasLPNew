import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth-service';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.page.html',
  styleUrls: ['./forgot.page.scss'],
  standalone: false,
})
export class ForgotPage implements OnInit {

  constructor(private api:AuthService, private alert:AlertController) { }
  email:string = "";

  ngOnInit() {
  }

  async forgot(){
    try{
      const res = await this.api.forgot(this.email)
      console.log(res);
      this.presentAlert('Exito', '', 'Revisa tu correo para restablecer tu contraseña')
    } catch(error:any){
      if(error.code == 'ERR_BAD_REQUEST'){
        this.presentAlert('Error', 'Correo no registrado', 'Verifica tus datos')
        return
      }
      if(error.code == 'ERR_NETWORK'){
        this.presentAlert('Error', 'No se puede conectar al servidor', 'Intenta más tarde')
        return
      }
    }
  }

  async presentAlert(header:string, subHeader:string, message:string) {
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
