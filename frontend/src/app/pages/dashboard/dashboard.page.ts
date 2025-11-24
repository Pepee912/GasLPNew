// src/app/dashboard/dashboard.page.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';

import { ServiciosService } from 'src/app/services/servicios';
import { EstadoServicioService } from 'src/app/services/estado-servicio';
import { RutasService } from 'src/app/services/rutas';
import { TipoServiciosService } from 'src/app/services/tipo-servicios';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  // ======== Info de usuario / roles ========
  user: any = null;
  userRoleLabel: string = '';

  canViewClientes       = false;
  canViewUsuarios       = false;
  canViewServicios      = false;
  canViewRutas          = false;
  canViewTipoServicio   = false;
  canViewEstadoServicio = false;

  isOperador = false;

  // ======== Servicios / estados ========
  servicios: any[] = [];
  estados: any[] = [];
  mapaEstados: Record<string, any> = {};

  loading = false;
  errorMessage: string | null = null;
  updatingId: string | null = null;

  // ======== Vista y filtros en memoria ========
  vista: 'hoy' | 'todos' = 'hoy';
  filtroEstado: string = 'todos';
  searchTerm: string = '';

  // ======== Paginación ========
  page = 1;
  pageSize = 20;
  pageCount = 1;
  total = 0;

  // ======== Filtros avanzados (backend) ========
  // Día (solo en vista "todos")
  dateFilterMode: 'todos' | 'hoy' | 'ayer' | 'fecha' = 'todos';
  selectedFecha: string | null = null; // valor de ion-datetime

  // Filtro por ruta (para admin / callcenter)
  rutas: any[] = [];
  selectedRutaId: string | null = null;

  // Filtro por tipo de servicio
  tiposServicio: any[] = [];
  selectedTipoServicio: string | null = null;

  constructor(
    private router: Router,
    private serviciosService: ServiciosService,
    private estadoServicioService: EstadoServicioService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private rutasService: RutasService,
    private tipoServiciosService: TipoServiciosService,
  ) {}

  // ===========================================================
  //                      CICLO DE VIDA
  // ===========================================================

  async ngOnInit() {
    this.cargarUsuarioYPermisos();
    await this.initData();
  }

  // Se llama cada vez que entras a la página
  async ionViewWillEnter() {
    this.cargarUsuarioYPermisos();
  }

  // ===========================================================
  //                  HELPERS GENERALES / UTIL
  // ===========================================================

  private unwrapCollection(raw: any): any[] {
    // Si ya es array
    if (Array.isArray(raw)) return raw;
    // Strapi: { data: [...] }
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }

  // ===========================================================
  //                 USUARIO / PERMISOS / ROLES
  // ===========================================================

  private cargarUsuarioYPermisos() {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      console.warn('No hay user en localStorage');
      return;
    }

    try {
      this.user = JSON.parse(userStr);

      console.log('Usuario completo:', this.user);

      const roleName = (this.user.role?.name || '').toString().toLowerCase();
      const roleType = (this.user.role?.type || '').toString().toLowerCase();
      const rawRole  = (roleType || roleName || '').trim().toLowerCase();

      this.userRoleLabel = this.user.role?.name || 'Usuario';

      // Permisos según rol
      this.setPermissions(rawRole);

      // bandera operador
      this.isOperador = rawRole === 'operador';

    } catch (err) {
      console.error('Error parseando user de localStorage', err);
    }
  }

  private setPermissions(rawRole: string) {
    // 1) Reset
    this.canViewClientes       = false;
    this.canViewUsuarios       = false;
    this.canViewServicios      = false;
    this.canViewRutas          = false;
    this.canViewTipoServicio   = false;
    this.canViewEstadoServicio = false;

    const role = (rawRole || '').trim().toLowerCase();

    if (role === 'administrador') {
      this.canViewClientes       = true;
      this.canViewUsuarios       = true;
      this.canViewServicios      = true;
      this.canViewRutas          = true;
      this.canViewTipoServicio   = true;
      this.canViewEstadoServicio = true;
      return;
    }

    if (role === 'callcenter') {
      this.canViewClientes  = true;
      this.canViewServicios = true;
      return;
    }

    if (role === 'operador') {
      this.canViewServicios = true;
      return;
    }

    // Rol desconocido → todos en false
  }

  // ===========================================================
  //                        NAVEGACIÓN
  // ===========================================================

  goClientes() {
    this.router.navigateByUrl('/clientes');
  }

  goUsuarios() {
    this.router.navigateByUrl('/dashboard-usuarios');
  }

  // La vista actual de dashboard ya SON los servicios
  goServicios() {
    this.router.navigateByUrl('/dashboard');
  }

  goRutas() {
    this.router.navigateByUrl('/dashboard-ruta');
  }

  goTipoServicio() {
    this.router.navigateByUrl('/tipo-servicio');
  }

  goEstadoServicio() {
    this.router.navigateByUrl('/estado-servicio');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }

  // ===========================================================
  //                      CARGA INICIAL
  // ===========================================================

  private async initData() {
    this.loading = true;
    this.errorMessage = null;

    try {
      await Promise.all([
        this.loadEstados(),
        this.loadRutas(),
        this.loadTiposServicio(),
      ]);

      // vista por defecto "hoy"
      await this.loadServiciosHoy();
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

  // ------------------- Catálogos -------------------

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

  private async loadRutas() {
    try {
      const res = await this.rutasService.list();
      this.rutas = this.unwrapCollection(res);
    } catch (err) {
      console.error('Error cargando rutas', err);
      this.rutas = [];
    }
  }

  private async loadTiposServicio() {
    try {
      const res = await this.tipoServiciosService.list();
      this.tiposServicio = this.unwrapCollection(res);
    } catch (err) {
      console.error('Error cargando tipos de servicio', err);
      this.tiposServicio = [];
    }
  }

  get estadosParaSelect(): any[] {
    if (this.isOperador) {
      // Solo puede marcar Surtido
      return this.estados.filter(e => e.tipo === 'Surtido');
    }
    // Admin / Callcenter: todos
    return this.estados;
  }

  // ===========================================================
  //           CONSTRUCCIÓN DE PARÁMETROS / PAGINACIÓN
  // ===========================================================

  private setPaginationFromMeta(meta: any) {
    if (meta?.pagination) {
      this.page      = meta.pagination.page;
      this.pageSize  = meta.pagination.pageSize;
      this.pageCount = meta.pagination.pageCount;
      this.total     = meta.pagination.total;
    } else {
      this.page      = 1;
      this.pageSize  = this.servicios.length || this.pageSize;
      this.pageCount = 1;
      this.total     = this.servicios.length;
    }
  }

  private buildListOptions(sort: string) {
    const options: any = {
      page: this.page,
      pageSize: this.pageSize,
      'sort[0]': sort,
    };

    // --- Fecha / día ---
    if (this.vista === 'hoy') {
      // Vista "hoy" → siempre dia=hoy
      options.dia = 'hoy';
    } else {
      // Vista "todos"
      if (this.dateFilterMode === 'hoy') {
        options.dia = 'hoy';
      } else if (this.dateFilterMode === 'ayer') {
        options.dia = 'ayer';
      } else if (this.dateFilterMode === 'fecha' && this.selectedFecha) {
        // ion-datetime: 'YYYY-MM-DDTHH:mm:ss.sssZ'
        options.fecha = this.selectedFecha.split('T')[0]; // 'YYYY-MM-DD'
      }
      // 'todos' → sin filtro de fecha
    }

    // --- Ruta ---
    if (this.selectedRutaId) {
      options.rutaDocumentId = this.selectedRutaId;
    }

    // --- Estado (solo si no es "todos") ---
    if (this.filtroEstado !== 'todos') {
      options.estado = this.filtroEstado;
    }

    // --- Tipo de servicio ---
    if (this.selectedTipoServicio) {
      options.tipo = this.selectedTipoServicio;
    }

    return options;
  }

  // ===========================================================
  //                   CARGA DE SERVICIOS
  // ===========================================================

  async loadServiciosHoy(event?: any) {
    if (!event) this.loading = true;
    this.errorMessage = null;

    try {
      const resp = await this.serviciosService.list(
        this.buildListOptions('fecha_programado:asc')
      );

      const data = Array.isArray(resp) ? resp : (resp?.data ?? []);
      this.servicios = data;

      const meta = (resp as any)?.meta;
      this.setPaginationFromMeta(meta);
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
      const resp = await this.serviciosService.list(
        this.buildListOptions('fecha_programado:desc')
      );

      const data = Array.isArray(resp) ? resp : (resp?.data ?? []);
      this.servicios = data;

      const meta = (resp as any)?.meta;
      this.setPaginationFromMeta(meta);
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

    // Reset paginación y filtros al cambiar vista
    this.page = 1;
    this.dateFilterMode = 'todos';
    this.selectedFecha = null;
    this.filtroEstado = 'todos';
    this.searchTerm = '';
    this.selectedRutaId = null;
    this.selectedTipoServicio = null;

    if (this.vista === 'hoy') {
      await this.loadServiciosHoy();
    } else {
      await this.loadServiciosTodos();
    }
  }

  async onFiltersChange() {
    this.page = 1;
    if (this.vista === 'hoy') {
      await this.loadServiciosHoy();
    } else {
      await this.loadServiciosTodos();
    }
  }

  async nextPage() {
    if (this.page >= this.pageCount) return;
    this.page++;
    if (this.vista === 'hoy') {
      await this.loadServiciosHoy();
    } else {
      await this.loadServiciosTodos();
    }
  }

  async prevPage() {
    if (this.page <= 1) return;
    this.page--;
    if (this.vista === 'hoy') {
      await this.loadServiciosHoy();
    } else {
      await this.loadServiciosTodos();
    }
  }

  // ===========================================================
  //                HELPERS DE LECTURA / PRESENTACIÓN
  // ===========================================================

  getNombreCliente(servicio: any): string {
    if (this.isOperador) {
      // El operador no debe ver datos personales del cliente
      return 'Cliente';
    }

    return servicio?.cliente
      ? `${servicio.cliente.nombre || ''} ${servicio.cliente.apellidos || ''}`.trim()
      : 'Sin cliente';
  }

  getTituloServicio(servicio: any): string {
    if (this.isOperador) {
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

  // Nombre de la ruta
  getRutaNombre(servicio: any): string {
    const r = servicio?.ruta;
    return r?.nombre || 'Sin ruta asignada';
  }

  // Teléfono del cliente (sólo admin/callcenter)
  getTelefonoCliente(servicio: any): string {
    if (this.isOperador) return '';
    return servicio?.cliente?.telefono || 'Sin teléfono';
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

    // Filtro por estado (además del backend, se aplica en memoria)
    if (this.filtroEstado !== 'todos') {
      lista = lista.filter(s => this.getEstadoNombre(s) === this.filtroEstado);
    }

    // Búsqueda por texto
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (term) {
      lista = lista.filter(s => {
        const dir  = this.getDireccion(s).toLowerCase();
        const tipo = this.getTipoServicio(s).toLowerCase();

        if (this.isOperador) {
          // Operador: solo dirección y tipo
          return dir.includes(term) || tipo.includes(term);
        }

        // Admin / Callcenter: también por cliente y teléfono
        const nombre = this.getNombreCliente(s).toLowerCase();
        const tel    = (s.cliente?.telefono || '').toString().toLowerCase();

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

  // ===========================================================
  //                NOTA DEL OPERADOR / CAMBIO ESTADO
  // ===========================================================

  private async pedirNotaSurtido(): Promise<string | null> {
    const alert = await this.alertCtrl.create({
      header: 'Nota del operador',
      message: '¿Deseas agregar una nota sobre la entrega? (opcional)',
      inputs: [
        {
          name: 'nota',
          type: 'textarea',
          placeholder: 'Ej. Cliente no estaba en casa, tanque dañado, etc.',
        },
      ],
      buttons: [
        {
          text: 'Omitir',
          role: 'cancel',
        },
        {
          text: 'Guardar',
          role: 'confirm',
        },
      ],
      mode: 'ios',
    });

    await alert.present();
    const result = await alert.onDidDismiss();

    if (result.role === 'confirm') {
      const nota = result.data?.values?.nota ?? '';
      const trimmed = (nota || '').trim();
      return trimmed || null;
    }

    return null;
  }

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
    const estadoKey  = this.getEstadoKey(nuevoEstado);

    if (!servicioId || !estadoKey) return;

    this.updatingId = servicioId;

    try {
      const payload: any = {
        estado_servicio: estadoKey,
      };

      // Si es operador y marca Surtido → pedir nota (opcional)
      if (this.isOperador && nuevoEstado.tipo === 'Surtido') {
        const nota = await this.pedirNotaSurtido();
        if (nota) {
          payload.nota_operador = nota;
        }
      }

      await this.serviciosService.update(servicioId, payload);

      // Actualizar en memoria
      servicio.estado_servicio = nuevoEstado;
      if (payload.nota_operador) {
        servicio.nota_operador = payload.nota_operador;
      }

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
