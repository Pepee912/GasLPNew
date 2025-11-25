// src/app/pages/rutas/dashboard-ruta/dashboard-ruta.page.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { RutasService, Ruta } from 'src/app/services/rutas';

@Component({
  selector: 'app-dashboard-ruta',
  templateUrl: './dashboard-ruta.page.html',
  styleUrls: ['./dashboard-ruta.page.scss'],
  standalone: false,
})
export class DashboardRutaPage implements OnInit {
  rutasActivas: Ruta[] = [];
  rutasInactivas: Ruta[] = [];
  loading = false;

  // segmento: qué lista se ve
  segment: 'activas' | 'inactivas' = 'activas';

  // filtro por nombre
  searchTerm = '';

  // paginación
  pageSize = 20;

  pageActivas = 1;
  totalActivas = 0;

  pageInactivas = 1;
  totalInactivas = 0;

  // modal
  isModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedRuta: Ruta | null = null;

  rutaForm!: FormGroup;

  constructor(
    private rutasSrv: RutasService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    // carga inicial: activas
    this.cargarActivas();
  }

  private initForm() {
    this.rutaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      estado: [true],
    });
  }

  // ---------- helpers de filtro ----------

  private buildNombreFilter(): any {
    const params: any = {};
    if (this.searchTerm.trim()) {
      params['filters[nombre][$containsi]'] = this.searchTerm.trim();
    }
    return params;
  }

  // ---------- cargar rutas (paginado) ----------

  async cargarActivas(event?: any, append: boolean = false) {
    if (!event) this.loading = true;

    try {
      const res: any = await this.rutasSrv.listPaged({
        'filters[estado][$eq]': true,
        'pagination[page]': this.pageActivas,
        'pagination[pageSize]': this.pageSize,
        'populate[personals]': true,
        'populate[servicios]': true,
        ...this.buildNombreFilter(),
      });

      const dataPage: any[] = res?.data ?? [];
      const meta = res?.meta ?? {};
      this.totalActivas = meta.pagination?.total ?? dataPage.length;

      this.rutasActivas = append
        ? [...this.rutasActivas, ...dataPage]
        : dataPage;
    } catch (err) {
      console.error(err);
      this.presentToast('Error al cargar rutas activas', 'danger');
      if (!append) {
        this.rutasActivas = [];
        this.totalActivas = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  async cargarInactivas(event?: any, append: boolean = false) {
    if (!event) this.loading = true;

    try {
      const res: any = await this.rutasSrv.listPaged({
        'filters[estado][$eq]': false,
        'pagination[page]': this.pageInactivas,
        'pagination[pageSize]': this.pageSize,
        'populate[personals]': true,
        'populate[servicios]': true,
        ...this.buildNombreFilter(),
      });

      const dataPage: any[] = res?.data ?? [];
      const meta = res?.meta ?? {};
      this.totalInactivas = meta.pagination?.total ?? dataPage.length;

      this.rutasInactivas = append
        ? [...this.rutasInactivas, ...dataPage]
        : dataPage;
    } catch (err) {
      console.error(err);
      this.presentToast('Error al cargar rutas desactivadas', 'danger');
      if (!append) {
        this.rutasInactivas = [];
        this.totalInactivas = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  // pull-to-refresh
  doRefresh(event: any) {
    if (this.segment === 'activas') {
      this.pageActivas = 1;
      this.cargarActivas(event);
    } else {
      this.pageInactivas = 1;
      this.cargarInactivas(event);
    }
  }

  onSegmentChange(ev: any) {
    const value = ev.detail.value as 'activas' | 'inactivas';
    this.segment = value;

    if (value === 'activas') {
      if (!this.rutasActivas.length) {
        this.pageActivas = 1;
        this.cargarActivas();
      }
    } else {
      if (!this.rutasInactivas.length) {
        this.pageInactivas = 1;
        this.cargarInactivas();
      }
    }
  }

  // ---------- filtros Buscar / Limpiar ----------

  async aplicarFiltros() {
    if (this.segment === 'activas') {
      this.pageActivas = 1;
      await this.cargarActivas();
    } else {
      this.pageInactivas = 1;
      await this.cargarInactivas();
    }
  }

  async limpiarFiltros() {
    this.searchTerm = '';
    this.pageActivas = 1;
    this.pageInactivas = 1;

    if (this.segment === 'activas') {
      await this.cargarActivas();
    } else {
      await this.cargarInactivas();
    }
  }

  // ---------- infinite scroll ----------

  async loadMore(event: any) {
    if (this.segment === 'activas') {
      if (this.rutasActivas.length >= this.totalActivas) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageActivas++;
      await this.cargarActivas(event, true);
    } else {
      if (this.rutasInactivas.length >= this.totalInactivas) {
        event.target.disabled = true;
        event.target.complete();
        return;
      }
      this.pageInactivas++;
      await this.cargarInactivas(event, true);
    }
  }

  // ---------- crear / editar ----------

  openCreateModal() {
    this.modalMode = 'create';
    this.selectedRuta = null;
    this.rutaForm.reset({
      nombre: '',
      estado: true,
    });
    this.isModalOpen = true;
  }

  openEditModal(ruta: Ruta) {
    this.modalMode = 'edit';
    this.selectedRuta = ruta;
    this.rutaForm.reset({
      nombre: ruta.nombre,
      estado: ruta.estado,
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRuta = null;
  }

  async saveRuta() {
    if (this.rutaForm.invalid) {
      this.rutaForm.markAllAsTouched();
      return;
    }

    const { nombre, estado } = this.rutaForm.value;

    try {
      if (this.modalMode === 'create') {
        await this.rutasSrv.create({ nombre });
        await this.presentToast('Ruta creada correctamente');
      } else if (this.modalMode === 'edit' && this.selectedRuta) {
        await this.rutasSrv.update(this.selectedRuta.documentId, {
          nombre,
          estado,
        });
        await this.presentToast('Ruta actualizada correctamente');
      }

      this.closeModal();
      // recargamos ambas listas para que reflejen cambios de estado
      this.pageActivas = 1;
      this.pageInactivas = 1;
      await this.cargarActivas();
      await this.cargarInactivas();
    } catch (err) {
      console.error(err);
      this.presentToast('Ocurrió un error al guardar la ruta', 'danger');
    }
  }

  // desactivar (soft delete)
  async confirmSoftDelete(ruta: Ruta) {
    const alert = await this.alertCtrl.create({
      header: 'Desactivar ruta',
      message:
        `¿Seguro que deseas desactivar la ruta <strong>${ruta.nombre}</strong>? ` +
        'Los registros históricos se mantienen.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.softDelete(ruta),
        },
      ],
    });

    await alert.present();
  }

  private async softDelete(ruta: Ruta) {
    try {
      await this.rutasSrv.softDelete(ruta.documentId);
      await this.presentToast('Ruta desactivada correctamente');

      this.pageActivas = 1;
      this.pageInactivas = 1;
      await this.cargarActivas();
      await this.cargarInactivas();
    } catch (err) {
      console.error(err);
      this.presentToast('Error al desactivar la ruta', 'danger');
    }
  }

  // reactivar desde la sección de inactivas
  async reactivateRuta(ruta: Ruta) {
    try {
      await this.rutasSrv.update(ruta.documentId, { estado: true });
      await this.presentToast('Ruta reactivada correctamente');

      this.pageActivas = 1;
      this.pageInactivas = 1;
      await this.cargarActivas();
      await this.cargarInactivas();
    } catch (err) {
      console.error(err);
      this.presentToast('Error al reactivar la ruta', 'danger');
    }
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' | 'medium' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
