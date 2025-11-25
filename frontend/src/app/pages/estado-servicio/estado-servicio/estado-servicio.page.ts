// src/app/pages/estado-servicio/estado-servicio.page.ts

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

  // Filtro por tipo
  searchTipo = '';

  // Paginación
  pageSize = 20;

  pageActivos = 1;
  totalActivos = 0;

  pageInactivos = 1;
  totalInactivos = 0;

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

  // ---------- Helpers de filtros ----------

  private buildTipoFilter(): any {
    const params: any = {};
    if (this.searchTipo.trim()) {
      params['filters[tipo][$containsi]'] = this.searchTipo.trim();
    }
    return params;
  }

  // ---------- Cargar datos con paginación ----------

  async cargarActivos(event?: any, append: boolean = false) {
    if (!event) this.loading = true;

    try {
      const res = await this.estadoSrv.listPaged({
        'filters[estado][$eq]': true,
        'pagination[page]': this.pageActivos,
        'pagination[pageSize]': this.pageSize,
        ...this.buildTipoFilter(),
      });

      const data = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? []);
      const meta = res.meta || {};
      this.totalActivos = meta.pagination?.total ?? data.length;

      this.estadosActivos = append
        ? [...this.estadosActivos, ...data]
        : data;
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar estados de servicio activos', 'danger');
      if (!append) {
        this.estadosActivos = [];
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
      const res = await this.estadoSrv.listPaged({
        'filters[estado][$eq]': false,
        'pagination[page]': this.pageInactivos,
        'pagination[pageSize]': this.pageSize,
        ...this.buildTipoFilter(),
      });

      const data = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? []);
      const meta = res.meta || {};
      this.totalInactivos = meta.pagination?.total ?? data.length;

      this.estadosInactivos = append
        ? [...this.estadosInactivos, ...data]
        : data;
    } catch (error) {
      console.error(error);
      this.presentToast('Error al cargar estados de servicio desactivados', 'danger');
      if (!append) {
        this.estadosInactivos = [];
        this.totalInactivos = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  // Pull-to-refresh
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
      if (!this.estadosActivos.length) {
        this.pageActivos = 1;
        this.cargarActivos();
      }
    } else {
      if (!this.estadosInactivos.length) {
        this.pageInactivos = 1;
        this.cargarInactivos();
      }
    }
  }

  // ---------- Filtros (Buscar / Limpiar) ----------

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
    this.searchTipo = '';
    this.pageActivos = 1;
    this.pageInactivos = 1;

    if (this.segment === 'activos') {
      await this.cargarActivos();
    } else {
      await this.cargarInactivos();
    }
  }

  // ---------- Infinite scroll ----------

  async loadMore(event: any) {
    if (this.segment === 'activos') {
      if (this.estadosActivos.length >= this.totalActivos) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageActivos++;
      await this.cargarActivos(event, true);
    } else {
      if (this.estadosInactivos.length >= this.totalInactivos) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageInactivos++;
      await this.cargarInactivos(event, true);
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
        this.pageActivos = 1;
        await this.cargarActivos();
      } else {
        this.pageInactivos = 1;
        await this.cargarInactivos();
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

      this.pageActivos = 1;
      this.pageInactivos = 1;
      await this.cargarActivos();
      await this.cargarInactivos();
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

      this.pageActivos = 1;
      this.pageInactivos = 1;
      await this.cargarActivos();
      await this.cargarInactivos();
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
