import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { TipoServiciosService } from 'src/app/services/tipo-servicios';

@Component({
  selector: 'app-tipo-servicio',
  templateUrl: './tipo-servicio.page.html',
  styleUrls: ['./tipo-servicio.page.scss'],
  standalone: false,
})
export class TipoServicioPage implements OnInit {

  tipoServiciosActivos: any[] = [];
  tipoServiciosInactivos: any[] = [];
  loading = false;

  segment: 'activos' | 'inactivos' = 'activos';

  // Modal
  isModalOpen = false;
  modo: 'crear' | 'editar' = 'crear';
  tipoForm!: FormGroup;
  tipoSeleccionado: any | null = null;

  constructor(
    private tipoSrv: TipoServiciosService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.cargarActivos();
  }

  private initForm() {
    this.tipoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  // --------- Cargar datos ---------

  async cargarActivos(event?: any) {
    this.loading = true;
    try {
      const res = await this.tipoSrv.list();
      this.tipoServiciosActivos = res.data || [];
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar tipos de servicio activos', 'danger');
    } finally {
      this.loading = false;
      event?.target.complete();
    }
  }

  async cargarInactivos(event?: any) {
    this.loading = true;
    try {
      const res = await this.tipoSrv.list({
        'filters[estado][$eq]': false
      });
      this.tipoServiciosInactivos = res.data || [];
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar tipos de servicio desactivados', 'danger');
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
    if (value === 'inactivos' && !this.tipoServiciosInactivos.length) {
      this.cargarInactivos();
    }
  }

  // --------- Modal Crear / Editar ---------

  abrirModalCrear() {
    this.modo = 'crear';
    this.tipoSeleccionado = null;
    this.tipoForm.reset({
      nombre: '',
    });
    this.isModalOpen = true;
  }

  abrirModalEditar(tipo: any) {
    this.modo = 'editar';
    this.tipoSeleccionado = tipo;
    this.tipoForm.reset({
      nombre: tipo.nombre || '',
    });
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  async guardar() {
    if (this.tipoForm.invalid) {
      this.tipoForm.markAllAsTouched();
      this.presentToast('Completa los campos obligatorios', 'warning');
      return;
    }

    const { nombre } = this.tipoForm.value;

    try {
      if (this.modo === 'crear') {
        await this.tipoSrv.create({
          nombre,
          estado: true, // nuevo tipo activo
        });
        this.presentToast('Tipo de servicio creado correctamente');
      } else if (this.modo === 'editar' && this.tipoSeleccionado) {
        await this.tipoSrv.update(this.tipoSeleccionado.documentId, {
          nombre,
        });
        this.presentToast('Tipo de servicio actualizado correctamente');
      }

      this.cerrarModal();
      if (this.segment === 'activos') {
        this.cargarActivos();
      } else {
        // por si estás editando uno desactivado
        this.cargarInactivos();
      }
    } catch (error: any) {
      console.error(error);
      this.presentToast('Error al guardar el tipo de servicio', 'danger');
    }
  }

  // --------- Desactivar / Reactivar ---------

  async confirmarDesactivar(tipo: any) {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar tipo de servicio',
      message: `¿Seguro que deseas desactivar <strong>${tipo.nombre}</strong>? Ya no se podrá usar en nuevos servicios, pero se conservará el historial.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.desactivar(tipo),
        },
      ],
    });

    await alert.present();
  }

  private async desactivar(tipo: any) {
    try {
      await this.tipoSrv.desactivar(tipo.documentId);
      this.presentToast('Tipo de servicio desactivado');
      this.cargarActivos();
      // opcional: si tienes el segment en inactivos recargar también
      this.cargarInactivos();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al desactivar el tipo de servicio', 'danger');
    }
  }

  async confirmarReactivar(tipo: any) {
    const alert = await this.alertCtrl.create({
      header: 'Reactivar tipo de servicio',
      message: `¿Reactivar <strong>${tipo.nombre}</strong> para usarlo nuevamente en servicios?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Reactivar',
          handler: () => this.reactivar(tipo),
        },
      ],
    });

    await alert.present();
  }

  private async reactivar(tipo: any) {
    try {
      await this.tipoSrv.reactivar(tipo.documentId);
      this.presentToast('Tipo de servicio reactivado');
      this.cargarInactivos();
      this.cargarActivos();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al reactivar el tipo de servicio', 'danger');
    }
  }

  // --------- Utilidad: Toast ---------

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
