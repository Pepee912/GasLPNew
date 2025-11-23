import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { EstadoServicioService } from 'src/app/services/estado-servicio';

@Component({
  selector: 'app-estado-servicio',
  templateUrl: './estado-servicio.page.html',
  styleUrls: ['./estado-servicio.page.scss'],
  standalone: false,
})
export class EstadoServicioPage implements OnInit {

  estadosActivos: any[] = [];
  estadosInactivos: any[] = [];
  loading = false;

  segment: 'activos' | 'inactivos' = 'activos';

  // Modal
  isModalOpen = false;
  modo: 'crear' | 'editar' = 'crear';
  estadoForm!: FormGroup;
  estadoSeleccionado: any | null = null;

  constructor(
    private estadoSrv: EstadoServicioService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.cargarActivos();
  }

  private initForm() {
    this.estadoForm = this.fb.group({
      tipo: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  // ---------- Cargar datos ----------

  async cargarActivos(event?: any) {
    this.loading = true;
    try {
      this.estadosActivos = await this.estadoSrv.list({
        'filters[estado][$eq]': true,
      });
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar estados de servicio activos', 'danger');
    } finally {
      this.loading = false;
      event?.target.complete();
    }
  }

  async cargarInactivos(event?: any) {
    this.loading = true;
    try {
      this.estadosInactivos = await this.estadoSrv.list({
        'filters[estado][$eq]': false,
      });
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar estados de servicio desactivados', 'danger');
    } finally {
      this.loading = false;
      event?.target.complete();
    }
  }

  doRefresh(event: any) {
    if (this.segment === 'activos') {
      this.cargarActivos(event);
    } else {
      this.cargarInactivos(event);
    }
  }

  onSegmentChange(ev: any) {
    const value = ev.detail.value as 'activos' | 'inactivos';
    this.segment = value;
    if (value === 'inactivos' && !this.estadosInactivos.length) {
      this.cargarInactivos();
    }
  }

  // ---------- Modal Crear / Editar ----------

  abrirModalCrear() {
    this.modo = 'crear';
    this.estadoSeleccionado = null;
    this.estadoForm.reset({
      tipo: '',
    });
    this.isModalOpen = true;
  }

  abrirModalEditar(estado: any) {
    this.modo = 'editar';
    this.estadoSeleccionado = estado;
    this.estadoForm.reset({
      tipo: estado.tipo || '',
    });
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  async guardar() {
    if (this.estadoForm.invalid) {
      this.estadoForm.markAllAsTouched();
      this.presentToast('Completa los campos obligatorios', 'warning');
      return;
    }

    const { tipo } = this.estadoForm.value;

    try {
      if (this.modo === 'crear') {
        await this.estadoSrv.create({
          tipo,
          estado: true, // nuevo estado activo
        });
        this.presentToast('Estado de servicio creado correctamente');
      } else if (this.modo === 'editar' && this.estadoSeleccionado) {
        await this.estadoSrv.update(this.estadoSeleccionado.documentId, {
          tipo,
        });
        this.presentToast('Estado de servicio actualizado correctamente');
      }

      this.cerrarModal();

      if (this.segment === 'activos') {
        this.cargarActivos();
      } else {
        this.cargarInactivos();
      }
    } catch (error: any) {
      console.error(error);
      this.presentToast('Error al guardar el estado de servicio', 'danger');
    }
  }

  // ---------- Desactivar / Reactivar ----------

  async confirmarDesactivar(estado: any) {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar estado de servicio',
      message: `¿Seguro que deseas desactivar <strong>${estado.tipo}</strong>? No se podrá usar en nuevos servicios, pero se conservará el historial.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.desactivar(estado),
        },
      ],
    });

    await alert.present();
  }

  private async desactivar(estado: any) {
    try {
      await this.estadoSrv.desactivar(estado.documentId);
      this.presentToast('Estado de servicio desactivado');
      this.cargarActivos();
      this.cargarInactivos();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al desactivar el estado de servicio', 'danger');
    }
  }

  async confirmarReactivar(estado: any) {
    const alert = await this.alertCtrl.create({
      header: 'Reactivar estado de servicio',
      message: `¿Reactivar <strong>${estado.tipo}</strong> para usarlo nuevamente?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Reactivar',
          handler: () => this.reactivar(estado),
        },
      ],
    });

    await alert.present();
  }

  private async reactivar(estado: any) {
    try {
      await this.estadoSrv.reactivar(estado.documentId);
      this.presentToast('Estado de servicio reactivado');
      this.cargarInactivos();
      this.cargarActivos();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al reactivar el estado de servicio', 'danger');
    }
  }

  // ---------- Utilidad: Toast ----------

  private async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
