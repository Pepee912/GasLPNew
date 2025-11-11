import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ServiciosService } from 'src/app/services/servicios';
import { EstadoServicioService } from 'src/app/services/estado-servicio';

@Component({
  selector: 'app-dashboard-servicios',
  templateUrl: './dashboard-servicios.page.html',
  styleUrls: ['./dashboard-servicios.page.scss'],
  standalone: false,
})
export class DashboardServiciosPage implements OnInit {

  servicios: any[] = [];
  estados: any[] = [];
  // mapa: documentId (o id) → estado completo
  mapaEstados: Record<string, any> = {};

  loading = false;
  errorMessage: string | null = null;

  // para deshabilitar solo el servicio que se está actualizando
  updatingId: string | null = null;

  constructor(
    private serviciosService: ServiciosService,
    private estadoServicioService: EstadoServicioService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.initData();
  }

  // Carga inicial: estados + servicios de hoy
  private async initData() {
    this.loading = true;
    this.errorMessage = null;

    try {
      await Promise.all([
        this.loadEstados(),
        this.loadServiciosHoy(),
      ]);
    } catch (err) {
      console.error('Error en carga inicial', err);
      this.errorMessage = 'No se pudo cargar la información.';
      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 2500,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  // Cargar estados de servicio activos
  private async loadEstados() {
    const data = await this.estadoServicioService.listActivos();
    this.estados = Array.isArray(data) ? data : [];

    this.mapaEstados = {};
    for (const e of this.estados) {
      const key = this.getEstadoKey(e);
      if (key) {
        this.mapaEstados[key] = e;
      }
    }
  }

  // Cargar servicios de hoy
  async loadServiciosHoy(event?: any) {
    if (!event) {
      this.loading = true;
    }
    this.errorMessage = null;

    try {
      const data = await this.serviciosService.getHoy();
      this.servicios = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error cargando servicios de hoy', err);
      this.servicios = [];
      this.errorMessage = 'No se pudieron cargar los servicios de hoy.';

      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 2500,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.loading = false;
      if (event) {
        event.target.complete();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers de lectura
  // ---------------------------------------------------------------------------

  getNombreCliente(servicio: any): string {
    return servicio?.cliente
      ? `${servicio.cliente.nombre || ''} ${servicio.cliente.apellidos || ''}`.trim()
      : 'Sin cliente';
  }

  getDireccion(servicio: any): string {
    const d = servicio?.domicilio;
    if (!d) return 'Sin domicilio';

    const partes = [
      d.calle,
      d.numero,
      d.colonia,
      d.cp ? `CP ${d.cp}` : null,
    ].filter(Boolean);

    return partes.join(', ');
  }

  getTipoServicio(servicio: any): string {
    return servicio?.tipo_servicio?.nombre || 'Sin tipo';
  }

  getHoraProgramado(servicio: any): string {
    if (!servicio?.fecha_programado) return 'Sin hora';
    const fecha = new Date(servicio.fecha_programado);
    return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  // Clave consistente para estados (documentId o id como string)
  private getEstadoKey(estado: any): string | null {
    if (!estado) return null;
    if (estado.documentId) return estado.documentId;
    if (estado.id) return String(estado.id);
    return null;
  }

  // Nombre del estado actual del servicio
  getEstadoNombre(servicio: any): string {
    return servicio?.estado_servicio?.tipo || 'Sin estado';
  }

  // Valor seleccionado en el ion-select (documentId/id del estado actual)
  getEstadoSeleccionado(servicio: any): string | null {
    const estado = servicio?.estado_servicio;
    return this.getEstadoKey(estado);
  }

  // ---------------------------------------------------------------------------
  // Cambio de estado desde el ion-select
  // ---------------------------------------------------------------------------

  async onEstadoChange(servicio: any, event: any) {
    const nuevoEstadoKey = event.detail.value; // documentId o id del estado
    if (!nuevoEstadoKey) return;

    const nuevoEstado = this.mapaEstados[nuevoEstadoKey];
    if (!nuevoEstado) {
      console.warn('No se encontró estado con key:', nuevoEstadoKey);
      return;
    }

    await this.actualizarEstadoServicio(servicio, nuevoEstado);
  }

  private async actualizarEstadoServicio(servicio: any, nuevoEstado: any) {
    const servicioId = servicio.documentId || servicio.id;
    const estadoKey = this.getEstadoKey(nuevoEstado);

    if (!servicioId || !estadoKey) return;

    this.updatingId = servicioId;

    try {
      // Aquí mandamos la relación; Strapi backend validará permisos (operador vs admin)
      await this.serviciosService.update(servicioId, {
        estado_servicio: estadoKey,

        // ejemplo: si el estado es "Surtido", marcamos fecha_surtido
        ...(nuevoEstado.tipo === 'Surtido'
          ? { fecha_surtido: new Date().toISOString() }
          : {}),
        // podrías también limpiar fecha_cancelado si corresponde, etc.
      });

      // Actualizamos en memoria sin recargar todo si quieres:
      servicio.estado_servicio = nuevoEstado;

      const toast = await this.toastCtrl.create({
        message: `Estado actualizado a "${nuevoEstado.tipo}"`,
        duration: 2000,
        color: 'success',
      });
      await toast.present();

    } catch (err) {
      console.error('Error actualizando estado del servicio', err);
      const toast = await this.toastCtrl.create({
        message: 'No se pudo actualizar el estado del servicio.',
        duration: 2500,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.updatingId = null;
    }
  }
}
