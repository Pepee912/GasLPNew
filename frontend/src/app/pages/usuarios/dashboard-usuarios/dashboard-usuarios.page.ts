// src/app/pages/usuarios/dashboard-usuarios/dashboard-usuarios.page.ts

import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { UsuariosService } from 'src/app/services/usuarios';
import { PersonalService } from 'src/app/services/personal';

@Component({
  selector: 'app-dashboard-usuarios',
  templateUrl: './dashboard-usuarios.page.html',
  styleUrls: ['./dashboard-usuarios.page.scss'],
  standalone: false,
})
export class DashboardUsuariosPage implements OnInit {

  usuarios: any[] = [];
  roles: any[] = [];
  loading = false;

  // guarda el rol "Operador" para comparaciones rápidas
  operadorRole: any | null = null;

  constructor(
    private usuariosSrv: UsuariosService,
    private personalSrv: PersonalService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) { }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async ionViewWillEnter() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    this.loading = true;
    try {
      // 1) Cargar roles
      this.roles = await this.usuariosSrv.listRoles();

      // identificar el rol Operador por nombre o type
      this.operadorRole =
        this.roles.find((r: any) =>
          r.name === 'Operador' || r.type === 'operador'
        ) || null;

      // 2) Cargar usuarios
      this.usuarios = await this.usuariosSrv.list();
      console.log('Usuarios cargados:', this.usuarios);

    } catch (err) {
      console.error('Error cargando usuarios/roles', err);
      this.presentToast('Error al cargar usuarios o roles');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cambiar rol desde el dashboard.
   * Se le puede llamar desde un ion-select, botones, etc.
   */
  async onChangeRol(usuario: any, nuevoRolId: number) {
    try {
      const updated = await this.usuariosSrv.updateRole(usuario.id, nuevoRolId);
      usuario.role = updated.role; // actualizar vista

      // Si el nuevo rol es Operador y aún no tiene registro en Personal, lo creamos.
      if (this.operadorRole && nuevoRolId === this.operadorRole.id) {
        if (!usuario.personal) {
          const personal = await this.personalSrv.createFromUser(usuario, {
            nombre: usuario.username,
            apellidos: '',
            telefono: '', // luego podrías tomarlo de algún campo
          });

          // Strapi suele devolver algo tipo { data: {...} } o directamente el objeto,
          // ajusta según tu respuesta real:
          usuario.personal = (personal.data ?? personal);
        }
      }

      this.presentToast('Rol actualizado correctamente');

    } catch (err) {
      console.error('Error actualizando rol', err);
      this.presentToast('Error al actualizar el rol');
    }
  }

  /**
   * Bloquear / desbloquear usuario (en lugar de eliminar).
   */
  async onToggleBloqueo(usuario: any) {
    const nuevoEstado = !usuario.blocked;
    const accion = nuevoEstado ? 'bloquear' : 'desbloquear';

    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Seguro que deseas ${accion} al usuario <strong>${usuario.username}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            try {
              if (nuevoEstado) {
                await this.usuariosSrv.block(usuario.id);
              } else {
                await this.usuariosSrv.unblock(usuario.id);
              }
              usuario.blocked = nuevoEstado;
              this.presentToast(`Usuario ${accion} correctamente`);
            } catch (err) {
              console.error('Error cambiando estado blocked', err);
              this.presentToast('Error al actualizar el estado del usuario');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
