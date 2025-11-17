import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';

import { ClientesService } from 'src/app/services/clientes';
import { DomiciliosService } from 'src/app/services/domicilios';
import { ServiciosService } from 'src/app/services/servicios';
import { TipoServiciosService } from 'src/app/services/tipo-servicios';
import { RutasService } from 'src/app/services/rutas';
import { EstadoServicioService } from 'src/app/services/estado-servicio';

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

  clienteExistente: ClienteLite | null = null;
  domiciliosExistentes: DomicilioLite[] = [];

  usarDomicilioExistente = false;
  domicilioElegidoDocumentId: string | number | null = null;

  tipoServicios: AnyEntity[] = [];
  rutas: AnyEntity[] = [];
  loadingCatalogos = false;

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
    private estadoSrv: EstadoServicioService,
    private toast: ToastController,
    private alert: AlertController,
    private nav: NavController,
    private router: Router,
  ) {
    this.fSrv.get('tipo_servicio')?.disable({ emitEvent: false });
    this.fSrv.get('ruta')?.disable({ emitEvent: false });
  }

  async ngOnInit() {
    await this.cargarCatalogos();

    const state = history.state as { telefono?: string } | undefined;
    const telFromState = this.sanitizePhone(state?.telefono || '');

    if (telFromState) {
      this.fCliente.patchValue({ telefono: telFromState });
      await this.buscarClientePorTelefono();
    } else {
      this.usarDomicilioExistente = false;
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
    let message =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Ocurrió un error inesperado.';

    const lower = (message || '').toLowerCase();
    if (
      lower.includes('teléfono') ||
      lower.includes('telefono') ||
      lower.includes('unique') ||
      lower.includes('ya existe un cliente con ese número')
    ) {
      message = 'Ya existe un cliente con ese número telefónico.';
    }

    const a = await this.alert.create({
      header: title,
      message,
      buttons: ['OK'],
      mode: 'ios',
    });
    await a.present();
  }

  private flat<T = any>(item: any): T {
    if (!item) return item;
    return { ...item, ...(item.attributes || {}) };
  }

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

  // Decide el estado inicial según si tiene ruta o no
  private async getEstadoInicial(rutaId: any): Promise<any | null> {
    const tipo = rutaId ? 'Asignado' : 'Programado';
    try {
      const raw = await this.estadoSrv.getByTipo(tipo);
      if (!raw) {
        console.warn(`No se encontró estado_servicio activo con tipo "${tipo}"`);
        return null;
      }
      return this.flat(raw);
    } catch (e) {
      console.error('Error obteniendo estado_inicial', e);
      return null;
    }
  }

  // ----------------- Catálogos -----------------
  private async cargarCatalogos() {
    this.loadingCatalogos = true;

    const tipoCtrl = this.fSrv.get('tipo_servicio');
    const rutaCtrl = this.fSrv.get('ruta');

    tipoCtrl?.disable({ emitEvent: false });
    rutaCtrl?.disable({ emitEvent: false });

    try {
      const [tsRes, rtRes] = await Promise.all([
        this.tipoSrv.list(),
        this.rutasSrv.list(),
      ]);

      const ts = tsRes?.data ?? [];
      const rt = rtRes?.data ?? [];

      this.tipoServicios = ts.map((x: any) => this.flat(x));
      this.rutas = rt.map((x: any) => this.flat(x));

      if (this.tipoServicios.length) {
        tipoCtrl?.enable({ emitEvent: false });
      } else {
        tipoCtrl?.disable({ emitEvent: false });
      }

      if (this.rutas.length) {
        rutaCtrl?.enable({ emitEvent: false });
      } else {
        rutaCtrl?.disable({ emitEvent: false });
      }
    } catch (e) {
      console.error('Error cargando catálogos', e);
      this.tipoServicios = [];
      this.rutas = [];

      tipoCtrl?.disable({ emitEvent: false });
      rutaCtrl?.disable({ emitEvent: false });
    } finally {
      this.loadingCatalogos = false;
    }
  }

  // ----------------- Buscar cliente por teléfono -----------------
  async buscarClientePorTelefono() {
    const tel = this.sanitizePhone(this.fCliente.value.telefono || '');
    this.fCliente.patchValue({ telefono: tel });

    if (!/^\d{10}$/.test(tel)) {
      // Flujo de alta nueva sin cliente previo
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
        // Cliente encontrado
        this.clienteExistente = this.flat(raw);

        // Buscar domicilios del cliente
        const dRes = await this.domiciliosSrv.listByCliente(this.clienteExistente);
        const listaRaw = dRes?.data ?? [];
        this.domiciliosExistentes = listaRaw.map((d: any) => this.flat(d));

        // Si tiene domicilios, sugerimos usar uno existente
        this.usarDomicilioExistente = this.domiciliosExistentes.length > 0;

        const firstDom = this.domiciliosExistentes[0];
        this.domicilioElegidoDocumentId = firstDom ? (this.docIdOf(firstDom) as any) : null;

        await this.msg('Cliente encontrado. Puedes crear el servicio.', 'success');
      } else {
        // Sin cliente para ese teléfono
        this.clienteExistente = null;
        this.domiciliosExistentes = [];
        this.usarDomicilioExistente = false;
      }
    } catch {
      this.clienteExistente = null;
      this.domiciliosExistentes = [];
      this.usarDomicilioExistente = false;
    }
  }

  // ----------------- Helpers de domicilio -----------------

  /** Saber si el formulario de domicilio tiene algún dato escrito */
  private tieneDatosDomicilio(): boolean {
    const dom = this.fDom.value;
    return !!(
      (dom.calle && dom.calle.trim()) ||
      (dom.numero && dom.numero.trim()) ||
      (dom.colonia && dom.colonia.trim()) ||
      (dom.cp && String(dom.cp).trim()) ||
      (dom.referencia && dom.referencia.trim())
    );
  }

  /** Validar que haya domicilio completo cuando se va a crear un servicio */
  private async validarDomicilioParaServicio(): Promise<boolean> {
    if (this.usarDomicilioExistente) {
      if (!this.domicilioElegidoDocumentId) {
        await this.msg('Selecciona un domicilio para poder crear el servicio.', 'warning');
        return false;
      }
      return true;
    }

    // No se usa domicilio existente: debe capturarse uno nuevo con TODOS los datos requeridos
    const dom = this.fDom.value;

    if (
      !dom.calle || !dom.calle.trim() ||
      !dom.numero || !dom.numero.trim() ||
      !dom.colonia || !dom.colonia.trim() ||
      !dom.cp || !String(dom.cp).trim()
    ) {
      await this.msg(
        'Para crear un servicio debes capturar calle, número, colonia y código postal.',
        'warning'
      );
      return false;
    }

    return true;
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

    // Si va a haber servicio, la fecha programada es obligatoria
    if (quiereServicio && !srvValues.fecha_programado) {
      await this.msg('Selecciona la fecha programada para el servicio.', 'warning');
      return;
    }

    // Si va a haber servicio, debe haber un domicilio válido y completo
    if (quiereServicio) {
      const okDom = await this.validarDomicilioParaServicio();
      if (!okDom) {
        return;
      }
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
      const hayDatosDom = this.tieneDatosDomicilio();

      if (this.usarDomicilioExistente && this.domicilioElegidoDocumentId) {
        // Usa un domicilio existente
        domicilioRef = this.domicilioElegidoDocumentId;
      } else if (hayDatosDom || quiereServicio) {
        // Crea domicilio nuevo SOLO si:
        // - el usuario capturó datos, o
        // - se va a crear un servicio (ya validado que el domicilio esté completo)
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
      } else {
        // No hay domicilio existente ni datos capturados y NO se va a crear servicio
        // → no se crea domicilio en blanco
        domicilioRef = null;
      }

      // 3) Servicio solo si se indicó tipo_servicio
      if (quiereServicio) {
        if (!domicilioRef) {
          // Seguridad extra (no debería ocurrir si validarDomicilioParaServicio() pasó)
          await this.msg('No se pudo determinar un domicilio para el servicio.', 'danger');
          this.submitting = false;
          return;
        }

        const rutaRef = srvValues.ruta || null;

        // 👇 OBLIGAMOS a tener estado inicial, si no → NO se crea servicio
        const estadoInicial = await this.getEstadoInicial(rutaRef);
        if (!estadoInicial) {
          const tipoEsperado = rutaRef ? 'Asignado' : 'Programado';
          await this.msg(
            `No se encontró un estado de servicio "${tipoEsperado}" activo. ` +
            'Contacta al administrador antes de crear servicios.',
            'danger'
          );
          this.submitting = false;
          return;
        }

        const estadoRef = this.docIdOf(estadoInicial);

        const srvPayload: AnyEntity = {
          cliente: clienteRef,
          domicilio: domicilioRef,
          tipo_servicio: srvValues.tipo_servicio,
          ruta: rutaRef,
          observacion: srvValues.observacion || '',
          fecha_programado: this.toISO(srvValues.fecha_programado),
        };

        // Solo lo mandamos si encontramos estado_servicio válido
        if (estadoRef) {
          (srvPayload as any).estado_servicio = estadoRef;
        }

        await this.serviciosSrv.create(srvPayload);
      }

      await this.msg(
        quiereServicio
          ? 'Datos guardados correctamente.'
          : 'Cliente (y domicilio si se capturó) guardados correctamente.',
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
