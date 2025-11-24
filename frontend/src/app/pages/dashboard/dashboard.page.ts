import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';

import { ServiciosService } from 'src/app/services/servicios';
import { EstadoServicioService } from 'src/app/services/estado-servicio';

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

  // Vista y filtros
  vista: 'hoy' | 'todos' = 'hoy';
  filtroEstado: string = 'todos';
  searchTerm: string = '';

  constructor(
    private router: Router,
    private serviciosService: ServiciosService,
    private estadoServicioService: EstadoServicioService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.cargarUsuarioYPermisos();
    await this.initData();
  }

  // Se llama cada vez que entras a la página
  async ionViewWillEnter() {
    this.cargarUsuarioYPermisos();
  }

  // ==================== Usuario / permisos ====================
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
    // 1) Primero reseteamos todo
    this.canViewClientes       = false;
    this.canViewUsuarios       = false;
    this.canViewServicios      = false;
    this.canViewRutas          = false;
    this.canViewTipoServicio   = false;
    this.canViewEstadoServicio = false;

    const role = (rawRole || '').trim().toLowerCase();

    // 2) Asignamos según rol
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

    // Rol desconocido → se quedan todos en false
  }

  // ==================== Navegación (menú) ====================
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

    // limpiar filtros al cambiar vista
    this.filtroEstado = 'todos';
    this.searchTerm = '';
  }

  // ==================== Helpers de lectura ====================
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

    // Filtro por estado
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

  // ==================== Nota del operador ====================
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
