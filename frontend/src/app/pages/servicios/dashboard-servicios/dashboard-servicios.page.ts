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
  mapaEstados: Record<string, any> = {};

  loading = false;
  errorMessage: string | null = null;
  updatingId: string | null = null;

  // Vista y filtros
  vista: 'hoy' | 'todos' = 'hoy';
  filtroEstado: string = 'todos';
  searchTerm: string = '';

  // Info de rol
  roleName: string | null = null;
  isOperador = false;

  constructor(
    private serviciosService: ServiciosService,
    private estadoServicioService: EstadoServicioService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.loadUserRoleFromStorage();
    await this.initData();
  }

  // ==================== Rol de usuario ====================
  private loadUserRoleFromStorage() {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return;

      const user = JSON.parse(raw);
      const name = user?.role?.name || user?.role?.nombre || '';
      this.roleName = name.toLowerCase();
      this.isOperador = this.roleName === 'operador';
    } catch (e) {
      console.warn('No se pudo leer el usuario de localStorage', e);
    }
  }

  // ==================== Carga inicial ====================
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

  // ==================== Catálogo de estados ====================
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

  // Estados que aparecen en el <ion-select> según rol
  get estadosParaSelect(): any[] {
    if (this.isOperador) {
      // Solo puede marcar Surtido
      return this.estados.filter(e => e.tipo === 'Surtido');
    }
    // Admin / Callcenter: todos
    return this.estados;
  }

  // ==================== Servicios: hoy / todos ====================
  async loadServiciosHoy(event?: any) {
    if (!event) this.loading = true;
    this.errorMessage = null;

    try {
      const data = await this.serviciosService.getHoy();
      this.servicios = Array.isArray(data) ? data : (data?.data ?? []);
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
      if (event) event.target.complete();
    }
  }

  async loadServiciosTodos(event?: any) {
    if (!event) this.loading = true;
    this.errorMessage = null;

    try {
      const data = await this.serviciosService.list({
        'sort[0]': 'fecha_programado:desc',
      });

      this.servicios = Array.isArray(data) ? data : (data?.data ?? []);
    } catch (err) {
      console.error('Error cargando todos los servicios', err);
      this.servicios = [];
      this.errorMessage = 'No se pudieron cargar los servicios.';
      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 2500,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.loading = false;
      if (event) event.target.complete();
    }
  }

  async onVistaChange(event: any) {
    const value = event.detail.value as 'hoy' | 'todos';
    this.vista = value;

    if (this.vista === 'hoy') {
      await this.loadServiciosHoy();
    } else {
      await this.loadServiciosTodos();
    }

    this.filtroEstado = 'todos';
    this.searchTerm = '';
  }

  // ==================== Helpers de lectura ====================

  /** Nombre de cliente (oculto para operador) */
  getNombreCliente(servicio: any): string {
    if (this.isOperador) {
      // El operador no debe ver datos del cliente
      return 'Cliente';
    }

    return servicio?.cliente
      ? `${servicio.cliente.nombre || ''} ${servicio.cliente.apellidos || ''}`.trim()
      : 'Sin cliente';
  }

  /** Título principal de la tarjeta */
  getTituloServicio(servicio: any): string {
    if (this.isOperador) {
      // Para operador mostramos algo neutro
      const tipo = this.getTipoServicio(servicio);
      return tipo !== 'Sin tipo' ? tipo : 'Servicio de gas';
    }
    return this.getNombreCliente(servicio);
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

  private getEstadoKey(estado: any): string | null {
    if (!estado) return null;
    if (estado.documentId) return estado.documentId;
    if (estado.id) return String(estado.id);
    return null;
  }

  getEstadoNombre(servicio: any): string {
    return servicio?.estado_servicio?.tipo || 'Sin estado';
  }

  getEstadoSeleccionado(servicio: any): string | null {
    const estado = servicio?.estado_servicio;
    return this.getEstadoKey(estado);
  }

  getEstadoColor(servicio: any): string {
    const nombre = this.getEstadoNombre(servicio);

    switch (nombre) {
      case 'Programado':
        return 'medium';
      case 'Asignado':
        return 'warning';
      case 'Surtido':
        return 'success';
      case 'Cancelado':
        return 'danger';
      default:
        return 'light';
    }
  }

  // ==================== Filtro en memoria ====================
  get serviciosFiltrados(): any[] {
    let lista = this.servicios || [];

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      lista = lista.filter(s => this.getEstadoNombre(s) === this.filtroEstado);
    }

    // Búsqueda por texto
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (term) {
      lista = lista.filter(s => {
        const dir = this.getDireccion(s).toLowerCase();
        const tipo = this.getTipoServicio(s).toLowerCase();

        if (this.isOperador) {
          // Operador: solo busca por dirección y tipo de servicio
          return dir.includes(term) || tipo.includes(term);
        }

        // Admin / Callcenter: también por cliente y teléfono
        const nombre = this.getNombreCliente(s).toLowerCase();
        const tel = (s.cliente?.telefono || '').toString().toLowerCase();

        return (
          nombre.includes(term) ||
          tel.includes(term) ||
          dir.includes(term) ||
          tipo.includes(term)
        );
      });
    }

    return lista;
  }

  // ==================== Cambio de estado ====================
  async onEstadoChange(servicio: any, event: any) {
    const nuevoEstadoKey = event.detail.value;
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
      await this.serviciosService.update(servicioId, {
        estado_servicio: estadoKey,
      });

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
