import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ClientesService } from 'src/app/services/clientes';
import { DomiciliosService } from 'src/app/services/domicilios';

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

  // Lista de domicilios del cliente
  domicilios: any[] = [];
  loadingDomicilios = false;

  // Modal de domicilio
  domModalOpen = false;
  domicilioActualDocId: string | number | null = null;

  // Form principal (cliente)
  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: [''],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    estado: [true]
  });

  // Form del domicilio (modal)
  domForm = this.fb.group({
    calle: [''],
    numero: [''],
    colonia: [''],
    cp: [''],
    referencia: [''],
    estado: [true],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private clientesSrv: ClientesService,
    private domiciliosSrv: DomiciliosService,
    private nav: NavController,
    private toast: ToastController,
    private alert: AlertController
  ) {}

  async ngOnInit() {
    this.documentId = this.route.snapshot.paramMap.get('documentId') || '';
    await this.load();
  }

  private flat<T = any>(item: any): T {
    if (!item) return item;
    return { ...item, ...(item.attributes || {}) };
  }

  // ----------- Cargar cliente y domicilios -----------
  async load() {
    if (!this.documentId) {
      this.loading = false;
      return;
    }
    try {
      const res = await this.clientesSrv.getOne(this.documentId);
      const d = res?.data?.attributes ? res.data.attributes : res?.data || {};

      // Parchar cliente
      this.form.patchValue({
        nombre: d.nombre ?? '',
        apellidos: d.apellidos ?? '',
        telefono: d.telefono ?? '',
        estado: d.estado ?? true
      });

      // Cargar domicilios
      await this.loadDomicilios();
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

  async loadDomicilios() {
    if (!this.documentId) return;
    this.loadingDomicilios = true;
    try {
      const res = await this.domiciliosSrv.listByCliente(this.documentId);
      const rawList = res?.data ?? [];
      this.domicilios = rawList.map((d: any) => this.flat(d));
      //console.log('Domicilios cargados:', this.domicilios);
    } catch (err) {
      console.error('Error cargando domicilios:', err);
      this.domicilios = [];
    } finally {
      this.loadingDomicilios = false;
    }
  }

  // ----------- Guardar cambios del cliente -----------
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

  // ----------- Modal de domicilio -----------
  abrirModalDomicilio(d: any) {
    this.domicilioActualDocId = d.documentId || d.id;
    this.domForm.patchValue({
      calle: d.calle || '',
      numero: d.numero || '',
      colonia: d.colonia || '',
      cp: d.cp || '',
      referencia: d.referencia || '',
      estado: d.estado ?? true,
    });
    this.domModalOpen = true;
  }

  cerrarModalDomicilio() {
    this.domModalOpen = false;
    this.domicilioActualDocId = null;
    this.domForm.reset({
      calle: '',
      numero: '',
      colonia: '',
      cp: '',
      referencia: '',
      estado: true,
    });
  }

  async guardarDomicilio() {
    if (!this.domicilioActualDocId) return;

    try {
      const payload = this.domForm.value;
      await this.domiciliosSrv.update(this.domicilioActualDocId, payload);

      const t = await this.toast.create({
        message: 'Domicilio actualizado',
        duration: 1400,
        color: 'success',
      });
      await t.present();

      this.cerrarModalDomicilio();
      await this.loadDomicilios();
    } catch (err: any) {
      console.error('Error al actualizar domicilio:', err?.response?.data || err);
      const a = await this.alert.create({
        header: 'Error',
        message: err?.response?.data?.error?.message || 'No se pudo actualizar el domicilio.',
        buttons: ['OK'],
        mode: 'ios'
      });
      await a.present();
    }
  }
}
