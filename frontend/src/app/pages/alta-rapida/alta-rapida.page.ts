// src/app/pages/alta-rapida/alta-rapida.page.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';

import { ClientesService } from 'src/app/services/clientes';
import { DomiciliosService } from 'src/app/services/domicilios';
import { ServiciosService } from 'src/app/services/servicios';
import { TipoServiciosService } from 'src/app/services/tipo-servicios';
import { RutasService } from 'src/app/services/rutas';

type AnyEntity = any;
type ClienteLite = AnyEntity;
type DomicilioLite = AnyEntity;

@Component({
  selector: 'app-alta-rapida',
  templateUrl: './alta-rapida.page.html',
  styleUrls: ['./alta-rapida.page.scss'],
  standalone: false,
})
export class AltaRapidaPage implements OnInit {
  submitting = false;

  // Estado de búsqueda/selección
  clienteExistente: ClienteLite | null = null;
  domiciliosExistentes: DomicilioLite[] = [];
  usarDomicilioExistente = true;
  domicilioElegidoDocumentId: string | number | null = null;

  // Catálogos
  tipoServicios: AnyEntity[] = [];
  rutas: AnyEntity[] = [];
  loadingCatalogos = false;

  // Formularios reactivos
  fCliente = this.fb.group({
    telefono: [''],
    nombre: [''],
    apellidos: [''],
    activo: [true],
  });

  fDom = this.fb.group({
    calle: [''],
    numero: [''],
    colonia: [''],
    cp: [''],
    referencia: [''],
    activo: [true],
  });

  // Servicio opcional (sin nota)
  fSrv = this.fb.group({
    tipo_servicio: [null],
    ruta: [null],
    observacion: [''],
    fecha_programado: [''],
  });

  constructor(
    private fb: FormBuilder,
    private clientesSrv: ClientesService,
    private domiciliosSrv: DomiciliosService,
    private serviciosSrv: ServiciosService,
    private tipoSrv: TipoServiciosService,
    private rutasSrv: RutasService,
    private toast: ToastController,
    private alert: AlertController,
    private nav: NavController,
    private router: Router,
  ) {}

  async ngOnInit() {
    await this.cargarCatalogos();

    // Leer teléfono desde Clientes (Nuevo servicio) o desde búsqueda sin resultados
    const state = history.state as { telefono?: string } | undefined;
    const telFromState = this.sanitizePhone(state?.telefono || '');

    if (telFromState) {
      this.fCliente.patchValue({ telefono: telFromState });
      // 👇 En este caso sí intentamos buscar cliente existente
      await this.buscarClientePorTelefono();
    }
  }

  // ----------------- Helpers -----------------
  private sanitizePhone(v: string) {
    return (v || '').replace(/\D/g, '').trim();
  }

  private async msg(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    const t = await this.toast.create({ message, duration: 1600, color });
    await t.present();
  }

  private async alertCtrl(title: string, err: any) {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Ocurrió un error inesperado.';
    const a = await this.alert.create({
      header: title,
      message,
      buttons: ['OK'],
      mode: 'ios',
    });
    await a.present();
  }

  /** Aplana objeto Strapi */
  private flat<T = any>(item: any): T {
    if (!item) return item;
    return { ...item, ...(item.attributes || {}) };
  }

  /** Obtiene documentId o id */
  private docIdOf(o: any): string | number | null {
    if (!o) return null;
    const x: any = this.flat(o);
    return x.documentId ?? x.id ?? null;
  }

  /** Fecha a ISO */
  private toISO(value: any): string | null {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  }

  // ----------------- Catálogos -----------------
  private async cargarCatalogos() {
    this.loadingCatalogos = true;
    try {
      const [tsRes, rtRes] = await Promise.all([
        this.tipoSrv.list(),
        this.rutasSrv.list(),
      ]);

      const ts = tsRes?.data ?? [];
      const rt = rtRes?.data ?? [];

      this.tipoServicios = ts.map((x: any) => this.flat(x));
      this.rutas = rt.map((x: any) => this.flat(x));
    } catch (e) {
      console.error('Error cargando catálogos', e);
      this.tipoServicios = [];
      this.rutas = [];
    } finally {
      this.loadingCatalogos = false;
    }
  }

  // ----------------- Buscar cliente (solo usado internamente en ngOnInit) -----------------
  async buscarClientePorTelefono() {
    const tel = this.sanitizePhone(this.fCliente.value.telefono || '');
    this.fCliente.patchValue({ telefono: tel });

    if (!/^\d{10}$/.test(tel)) {
      // Aquí no mostramos error porque puede ser flujo de alta nueva,
      // simplemente no encontramos nada.
      this.clienteExistente = null;
      this.domiciliosExistentes = [];
      this.usarDomicilioExistente = false;
      return;
    }

    try {
      const res = await this.clientesSrv.findByPhone(tel);
      const resData = (res && (res as any).data) ? (res as any).data : res;

      let raw: any = null;
      if (Array.isArray(resData)) {
        raw = resData[0] ?? null;
      } else {
        raw = resData;
      }

      if (raw) {
        this.clienteExistente = this.flat(raw);

        const dRes = await this.domiciliosSrv.listByCliente(this.clienteExistente);
        const listaRaw = dRes?.data ?? [];
        this.domiciliosExistentes = listaRaw.map((d: any) => this.flat(d));

        this.usarDomicilioExistente = this.domiciliosExistentes.length > 0;
        const firstDom = this.domiciliosExistentes[0];
        this.domicilioElegidoDocumentId = firstDom ? (this.docIdOf(firstDom) as any) : null;

        await this.msg('Cliente encontrado. Puedes crear el servicio.', 'success');
      } else {
        this.clienteExistente = null;
        this.domiciliosExistentes = [];
        this.usarDomicilioExistente = false;
      }
    } catch {
      // Si falla (404, etc.), asumimos flujo de alta nueva
      this.clienteExistente = null;
      this.domiciliosExistentes = [];
      this.usarDomicilioExistente = false;
    }
  }

  // ----------------- Guardar todo -----------------
  async guardar() {
    const tel = this.sanitizePhone(this.fCliente.value.telefono || '');
    if (!/^\d{10}$/.test(tel)) {
      await this.msg('Ingresa un teléfono válido.', 'warning');
      return;
    }

    const srvValues = this.fSrv.value;
    const quiereServicio = !!srvValues.tipo_servicio;

    if (quiereServicio && !srvValues.fecha_programado) {
      await this.msg('Selecciona la fecha programada para el servicio.', 'warning');
      return;
    }

    this.submitting = true;
    try {
      // 1) Cliente
      let clienteObj = this.clienteExistente;
      if (!clienteObj) {
        const nuevo = await this.clientesSrv.create({
          nombre: this.fCliente.value.nombre,
          apellidos: this.fCliente.value.apellidos,
          telefono: tel,
          estado: this.fCliente.value.activo ?? true,
        });
        const raw = (nuevo && (nuevo as any).data) ? (nuevo as any).data : nuevo;
        clienteObj = this.flat(raw);
      }
      const clienteRef = this.docIdOf(clienteObj);

      // 2) Domicilio
      let domicilioRef: string | number | null = null;

      if (this.usarDomicilioExistente && this.domicilioElegidoDocumentId) {
        domicilioRef = this.domicilioElegidoDocumentId;
      } else {
        const domPayload: AnyEntity = {
          calle: this.fDom.value.calle || '',
          numero: this.fDom.value.numero || '',
          colonia: this.fDom.value.colonia || '',
          cp: this.fDom.value.cp || '',
          referencia: this.fDom.value.referencia || '',
          estado: this.fDom.value.activo ?? true,
          cliente: clienteRef,
        };
        const domRes = await this.domiciliosSrv.create(domPayload);
        const domRaw = (domRes && (domRes as any).data) ? (domRes as any).data : domRes;
        const domObj = this.flat(domRaw);
        domicilioRef = this.docIdOf(domObj);
      }

      // 3) Servicio solo si se indicó tipo_servicio
      if (quiereServicio) {
        const srvPayload: AnyEntity = {
          cliente: clienteRef,
          domicilio: domicilioRef,
          tipo_servicio: srvValues.tipo_servicio,
          ruta: srvValues.ruta || null,
          observacion: srvValues.observacion || '',
          fecha_programado: this.toISO(srvValues.fecha_programado),
        };

        await this.serviciosSrv.create(srvPayload);
      }

      await this.msg(
        quiereServicio
          ? 'Cliente, domicilio y servicio guardados correctamente'
          : 'Cliente y domicilio guardados (sin servicio)',
        'success'
      );
      this.nav.back();
    } catch (err: any) {
      console.error('[Alta rápida] Error:', err?.response?.data || err);
      await this.alertCtrl('No se pudo completar el alta', err);
    } finally {
      this.submitting = false;
    }
  }
}
