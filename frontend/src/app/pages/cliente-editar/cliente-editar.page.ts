import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ClientesService } from 'src/app/services/clientes';

@Component({
  selector: 'app-cliente-editar',
  templateUrl: './cliente-editar.page.html',
  styleUrls: ['./cliente-editar.page.scss'],
  standalone: false,
})
export class ClienteEditarPage implements OnInit {
  documentId = '';
  loading = true;
  saving = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: [''],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    estado: [true]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private clientesSrv: ClientesService,
    private nav: NavController,
    private toast: ToastController,
    private alert: AlertController
  ) {}

  async ngOnInit() {
    this.documentId = this.route.snapshot.paramMap.get('documentId') || '';
    await this.load();
  }

  async load() {
    if (!this.documentId) {
      this.loading = false;
      return;
    }
    try {
      const res = await this.clientesSrv.getOne(this.documentId);
      const d = res?.data?.attributes ? res.data.attributes : res?.data || {};
      // Parchar el form
      this.form.patchValue({
        nombre: d.nombre ?? '',
        apellidos: d.apellidos ?? '',
        telefono: d.telefono ?? '',
        estado: d.estado ?? true
      });
    } catch (err: any) {
      console.error('Error cargando cliente:', err?.response?.data || err);
      const a = await this.alert.create({
        header: 'Error',
        message: 'No se pudo cargar el cliente.',
        buttons: ['OK'],
        mode: 'ios'
      });
      await a.present();
      this.nav.back();
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.documentId) return;
    this.saving = true;
    try {
      const payload = this.form.value;
      await this.clientesSrv.update(this.documentId, payload);
      const t = await this.toast.create({ message: 'Cliente actualizado', duration: 1200, color: 'success' });
      await t.present();
      this.nav.back();
    } catch (err: any) {
      console.error('Error al actualizar:', err?.response?.data || err);
      const a = await this.alert.create({
        header: 'Error',
        message: err?.response?.data?.error?.message || 'No se pudo actualizar.',
        buttons: ['OK'],
        mode: 'ios'
      });
      await a.present();
    } finally {
      this.saving = false;
    }
  }
}
