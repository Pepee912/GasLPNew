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

  // búsqueda (aplica para ambas listas)
  searchTerm = '';

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
    this.loadRutas();
  }

  private initForm() {
    this.rutaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      estado: [true],
    });
  }

  async loadRutas() {
    this.loading = true;
    try {
      // activas
      const resAct: any = await this.rutasSrv.list({
        'populate[personals]': true,
        'populate[servicios]': true,
      });
      this.rutasActivas = resAct?.data ?? [];

      // inactivas
      const resInact: any = await this.rutasSrv.listInactivas({
        'populate[personals]': true,
        'populate[servicios]': true,
      });
      this.rutasInactivas = resInact?.data ?? [];
    } catch (err) {
      console.error(err);
      this.presentToast('Error al cargar rutas', 'danger');
    } finally {
      this.loading = false;
    }
  }

  // filtros para búsqueda
  get rutasActivasFiltradas(): Ruta[] {
    if (!this.searchTerm) return this.rutasActivas;
    const term = this.searchTerm.toLowerCase();
    return this.rutasActivas.filter(r => r.nombre?.toLowerCase().includes(term));
  }

  get rutasInactivasFiltradas(): Ruta[] {
    if (!this.searchTerm) return this.rutasInactivas;
    const term = this.searchTerm.toLowerCase();
    return this.rutasInactivas.filter(r => r.nombre?.toLowerCase().includes(term));
  }

  // crear
  openCreateModal() {
    this.modalMode = 'create';
    this.selectedRuta = null;
    this.rutaForm.reset({
      nombre: '',
      estado: true,
    });
    this.isModalOpen = true;
  }

  // editar
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
      this.loadRutas();
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
      this.loadRutas();
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
      this.loadRutas();
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
