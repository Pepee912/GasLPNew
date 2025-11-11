import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ClientesService } from 'src/app/services/clientes';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: false,
})
export class ClientesPage implements OnInit {

  clientes: any[] = [];
  loading = false;
  searching = false;
  telefono = '';

  page = 1;
  pageSize = 20;
  total = 0;

  private searchTimeout: any;

  // Segmento: activos / inactivos
  segmentValue: 'activos' | 'inactivos' = 'activos';

  constructor(
    private clientesSrv: ClientesService,
    private alertCtrl: AlertController,
    private toast: ToastController,
    private router: Router
  ) {}

  get mostrarInactivos(): boolean {
    return this.segmentValue === 'inactivos';
  }

  async ngOnInit() {
    await this.load();
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async onSegmentChange() {
    this.page = 1;
    this.telefono = '';
    await this.load();
  }

  async load(event?: any, append: boolean = false) {
    if (!event) {
      this.loading = true;
    }

    try {
      const estadoFiltro = this.mostrarInactivos ? false : true;

      const res = await this.clientesSrv.list({
        'pagination[page]': this.page,
        'pagination[pageSize]': this.pageSize,
        'filters[estado][$eq]': estadoFiltro,
        'populate[domicilios]': 'true',
        'populate[servicios]': 'true',
        'sort[0]': 'id:desc'
      });

      const data = res?.data ?? [];
      this.total = res?.meta?.pagination?.total ?? data.length;

      this.clientes = append ? [...this.clientes, ...data] : data;
    } catch (err) {
      console.error('Error listando clientes:', err);
      if (!append) {
        this.clientes = [];
        this.total = 0;
      }
    } finally {
      this.loading = false;
      event?.target?.complete?.();
    }
  }

  private sanitizePhone(v: string) {
    return (v || '').replace(/\D/g, '').trim();
  }

  private async showToast(
    message: string,
    color: 'success'|'warning'|'danger'|'medium' = 'medium'
  ) {
    const t = await this.toast.create({ message, duration: 1400, color });
    await t.present();
  }

  private async preguntarCrearCliente(tel: string) {
    // Solo tiene sentido en vista de activos
    if (this.mostrarInactivos) return;

    const alert = await this.alertCtrl.create({
      header: 'Cliente no encontrado',
      message: `No se encontró ningún cliente activo con el teléfono ${tel}. ¿Deseas registrar uno nuevo?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: () => {
            this.router.navigate(
              ['/callcenter/alta-rapida'],
              { state: { telefono: tel } }
            );
          }
        }
      ],
      mode: 'ios'
    });
    await alert.present();
  }

  // ========== BÚSQUEDA EN VIVO ==========

  async onTelefonoChange(value: string) {
    const tel = this.sanitizePhone(value || '');
    this.telefono = tel;

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!tel) {
      this.page = 1;
      await this.load();
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.buscarEnVivo(tel);
    }, 300);
  }

  private async buscarEnVivo(tel: string) {
    this.searching = true;
    try {
      const estadoFiltro = this.mostrarInactivos ? false : true;

      const res = await this.clientesSrv.list({
        'filters[telefono][$containsi]': tel,
        'filters[estado][$eq]': estadoFiltro,
        'pagination[page]': 1,
        'pagination[pageSize]': 100,
        'populate[domicilios]': 'true',
        'populate[servicios]': 'true',
        'sort[0]': 'telefono:asc'
      });

      this.clientes = res?.data ?? [];
      this.total = this.clientes.length;
    } catch (err) {
      console.error('Error buscando en vivo:', err);
      this.clientes = [];
      this.total = 0;
    } finally {
      this.searching = false;
    }
  }

  // ========== BOTÓN "Buscar"  ==========

  async buscarPorTelefono() {
    const tel = this.sanitizePhone(this.telefono);
    this.telefono = tel;

    if (!tel) {
      await this.showToast('Ingresa un teléfono', 'warning');
      return;
    }
    if (!/^\d{10}$/.test(tel)) {
      await this.showToast('Teléfono inválido (10 dígitos)', 'warning');
      this.clientes = [];
      this.total = 0;
      return;
    }

    this.loading = true;
    try {
      const res = await this.clientesSrv.findByPhone(tel);

      const payload = (res && typeof res === 'object' && 'data' in res)
        ? (res as any).data
        : res;

      let lista = payload
        ? (Array.isArray(payload) ? payload : [payload])
        : [];

      // Filtrar según el segmento actual (activos/inactivos)
      const estadoDeseado = this.mostrarInactivos ? false : true;
      lista = lista.filter(c => {
        const attrs = (c as any).attributes || c;
        return attrs.estado === estadoDeseado;
      });

      this.clientes = lista;
      this.total = this.clientes.length;

      if (!this.total) {
        await this.preguntarCrearCliente(tel);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        this.clientes = [];
        this.total = 0;
        await this.preguntarCrearCliente(tel);
      } else if (status === 400) {
        await this.showToast('Teléfono inválido', 'warning');
        this.clientes = [];
        this.total = 0;
      } else {
        console.error('Error al buscar:', err?.response?.data || err);
        await this.showToast('Error al buscar', 'danger');
        this.clientes = [];
        this.total = 0;
      }
    } finally {
      this.loading = false;
    }
  }

  clearSearch() {
    this.telefono = '';
    this.page = 1;
    this.load();
  }

  // ========== INFINITE SCROLL ==========

  async loadMore(event: any) {
    if (this.page * this.pageSize >= this.total) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }

    this.page++;
    await this.load(event, true);
  }

  nuevoCliente() {
    this.router.navigate(['/callcenter/alta-rapida']);
  }

  onEdit(item: any) {
    const documentId = item?.documentId ?? item?.attributes?.documentId;
    if (!documentId) {
      console.warn('Sin documentId, no se puede editar:', item);
      return;
    }
    this.router.navigate(['/clientes/editar', documentId]);
  }

  // Desactivar (soft delete)
  async onDelete(item: any) {
    const documentId = item?.documentId ?? item?.attributes?.documentId;
    if (!documentId) {
      console.warn('Sin documentId, no se puede desactivar:', item);
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Desactivar cliente',
      message: 'El cliente y sus domicilios quedarán inactivos. Los servicios se conservarán como historial. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.clientesSrv.deactivate(documentId);

              const t = await this.toast.create({
                message: 'Cliente desactivado',
                duration: 1200,
                color: 'success'
              });
              await t.present();

              this.page = 1;
              await this.load();
            } catch (err: any) {
              console.error('Error al desactivar:', err?.response?.data || err);
              const t = await this.toast.create({
                message: 'No se pudo desactivar el cliente',
                duration: 1500,
                color: 'danger'
              });
              await t.present();
            }
          }
        }
      ],
      mode: 'ios'
    });
    await alert.present();
  }

  // Reactivar cliente (desde pestaña de inactivos)
  async onReactivate(item: any) {
    const documentId = item?.documentId ?? item?.attributes?.documentId;
    if (!documentId) {
      console.warn('Sin documentId, no se puede reactivar:', item);
      return;
    }

    try {
      await this.clientesSrv.reactivate(documentId);

      const t = await this.toast.create({
        message: 'Cliente reactivado',
        duration: 1200,
        color: 'success'
      });
      await t.present();

      this.page = 1;
      await this.load();
    } catch (err: any) {
      console.error('Error al reactivar:', err?.response?.data || err);
      const t = await this.toast.create({
        message: 'No se pudo reactivar el cliente',
        duration: 1500,
        color: 'danger'
      });
      await t.present();
    }
  }
}
