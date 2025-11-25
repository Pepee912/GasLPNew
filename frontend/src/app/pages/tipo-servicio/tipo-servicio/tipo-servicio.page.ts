// src/app/pages/tipo-servicio/tipo-servicio.page.ts

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

  // segmento
  segment: 'activos' | 'inactivos' = 'activos';

  // filtros
  searchNombre = '';

  // paginación
  pageSize = 20;

  pageActivos = 1;
  totalActivos = 0;

  pageInactivos = 1;
  totalInactivos = 0;

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

  // --------- Cargar datos con paginación + filtros ---------

  private buildNombreFilter(): any {
    const params: any = {};
    if (this.searchNombre.trim()) {
      params['filters[nombre][$containsi]'] = this.searchNombre.trim();
    }
    return params;
  }

  async cargarActivos(event?: any, append: boolean = false) {
    if (!event) this.loading = true;

    try {
      const res = await this.tipoSrv.list({
        'filters[estado][$eq]': true,
        'pagination[page]': this.pageActivos,
        'pagination[pageSize]': this.pageSize,
        ...this.buildNombreFilter(),
      });

      const data = res.data || [];
      const meta = res.meta || {};
      this.totalActivos = meta.pagination?.total ?? data.length;

      this.tipoServiciosActivos = append
        ? [...this.tipoServiciosActivos, ...data]
        : data;
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar tipos de servicio activos', 'danger');
      if (!append) {
        this.tipoServiciosActivos = [];
        this.totalActivos = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  async cargarInactivos(event?: any, append: boolean = false) {
    if (!event) this.loading = true;

    try {
      const res = await this.tipoSrv.list({
        'filters[estado][$eq]': false,
        'pagination[page]': this.pageInactivos,
        'pagination[pageSize]': this.pageSize,
        ...this.buildNombreFilter(),
      });

      const data = res.data || [];
      const meta = res.meta || {};
      this.totalInactivos = meta.pagination?.total ?? data.length;

      this.tipoServiciosInactivos = append
        ? [...this.tipoServiciosInactivos, ...data]
        : data;
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar tipos de servicio desactivados', 'danger');
      if (!append) {
        this.tipoServiciosInactivos = [];
        this.totalInactivos = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  // pull-to-refresh
  doRefresh(event: any) {
    if (this.segment === 'activos') {
      this.pageActivos = 1;
      this.cargarActivos(event);
    } else {
      this.pageInactivos = 1;
      this.cargarInactivos(event);
    }
  }

  onSegmentChange(ev: any) {
    const value = ev.detail.value as 'activos' | 'inactivos';
    this.segment = value;

    if (value === 'activos') {
      if (!this.tipoServiciosActivos.length) {
        this.pageActivos = 1;
        this.cargarActivos();
      }
    } else {
      if (!this.tipoServiciosInactivos.length) {
        this.pageInactivos = 1;
        this.cargarInactivos();
      }
    }
  }

  // --------- Filtros (Buscar / Limpiar) ---------

  async aplicarFiltros() {
    if (this.segment === 'activos') {
      this.pageActivos = 1;
      await this.cargarActivos();
    } else {
      this.pageInactivos = 1;
      await this.cargarInactivos();
    }
  }

  async limpiarFiltros() {
    this.searchNombre = '';
    this.pageActivos = 1;
    this.pageInactivos = 1;

    if (this.segment === 'activos') {
      await this.cargarActivos();
    } else {
      await this.cargarInactivos();
    }
  }

  // --------- Infinite scroll ---------

  async loadMore(event: any) {
    if (this.segment === 'activos') {
      if (this.tipoServiciosActivos.length >= this.totalActivos) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageActivos++;
      await this.cargarActivos(event, true);
    } else {
      if (this.tipoServiciosInactivos.length >= this.totalInactivos) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageInactivos++;
      await this.cargarInactivos(event, true);
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

      // recargar la lista actual considerando filtros y paginación
      if (this.segment === 'activos') {
        this.pageActivos = 1;
        await this.cargarActivos();
      } else {
        this.pageInactivos = 1;
        await this.cargarInactivos();
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
      message: `¿Seguro que deseas desactivar ${tipo.nombre}? Ya no se podrá usar en nuevos
 servicios, pero se conservará el historial.`,
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

      // refrescar ambas listas desde página 1
      this.pageActivos = 1;
      this.pageInactivos = 1;
      await this.cargarActivos();
      await this.cargarInactivos();
    } catch (error) {
      console.error(error);
      this.presentToast('Error al desactivar el tipo de servicio', 'danger');
    }
  }

  async confirmarReactivar(tipo: any) {
    const alert = await this.alertCtrl.create({
      header: 'Reactivar tipo de servicio',
      message: `¿Reactivar ${tipo.nombre} para usarlo nuevamente en servicios?`,
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

      this.pageActivos = 1;
      this.pageInactivos = 1;
      await this.cargarActivos();
      await this.cargarInactivos();
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
