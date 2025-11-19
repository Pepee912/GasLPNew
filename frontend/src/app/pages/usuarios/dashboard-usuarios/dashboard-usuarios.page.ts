// src/app/pages/usuarios/dashboard-usuarios/dashboard-usuarios.page.ts

import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { UsuariosService } from 'src/app/services/usuarios';
import { PersonalService } from 'src/app/services/personal';
import { RutasService } from 'src/app/services/rutas';

@Component({
  selector: 'app-dashboard-usuarios',
  templateUrl: './dashboard-usuarios.page.html',
  styleUrls: ['./dashboard-usuarios.page.scss'],
  standalone: false,
})
export class DashboardUsuariosPage implements OnInit {

  usuarios: any[] = [];
  roles: any[] = [];
  rutas: any[] = [];
  loading = false;

  operadorRole: any | null = null;

  // Modales
  isCreateModalOpen = false;
  isEditModalOpen = false;

  // Modelo para CREAR usuario
  newUser: any = {
    username: '',
    email: '',
    password: '',
    roleId: null,
    personalNombre: '',
    personalApellidos: '',
    personalTelefono: '',
    personalRutaId: null as string | null,  // documentId de ruta
  };
  isOperadorSelectedCreate = false;

  // Modelo para EDITAR usuario
  editUser: any = {
    id: null,
    username: '',
    email: '',
    roleId: null,
    blocked: false,
    personalNombre: '',
    personalApellidos: '',
    personalTelefono: '',
    personalRutaId: null as string | null,  
    personalId: null as string | null,      
  };
  isOperadorSelectedEdit = false;

  constructor(
    private usuariosSrv: UsuariosService,
    private personalSrv: PersonalService,
    private rutasSrv: RutasService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) { }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async ionViewWillEnter() {
    await this.cargarDatos();
  }

  private async cargarDatos() {
    this.loading = true;
    try {
      // Roles
      this.roles = await this.usuariosSrv.listRoles();
      this.operadorRole =
        this.roles.find((r: any) =>
          r.name === 'Operador' || r.type === 'operador'
        ) || null;

      // Usuarios
      this.usuarios = await this.usuariosSrv.list();

      // Rutas activas
      const rutasRes = await this.rutasSrv.list();
      this.rutas = rutasRes.data ?? rutasRes;

    } catch (err) {
      console.error('Error cargando datos', err);
      this.presentToast('Error al cargar usuarios, roles o rutas');
    } finally {
      this.loading = false;
    }
  }

  getRutaNombre(ruta: any): string {
    return ruta?.attributes?.nombre || ruta?.nombre || 'Ruta';
  }

  // Crear personal si el rol es Operador (solo si todavía no tiene)
  private async ensurePersonalIfOperador(
    usuario: any,
    roleId: number,
    extraPersonal?: {
      nombre?: string;
      apellidos?: string;
      telefono?: string;
      rutaId?: string | null;  // documentId de ruta
    }
  ) {
    if (!this.operadorRole) return;
    if (roleId !== this.operadorRole.id) return;
    if (usuario.personal) return;

    const personal = await this.personalSrv.createFromUser(usuario, {
      nombre: extraPersonal?.nombre ?? usuario.username,
      apellidos: extraPersonal?.apellidos ?? '',
      telefono: extraPersonal?.telefono ?? '',
      rutaId: extraPersonal?.rutaId ?? null,
    });

    usuario.personal = personal.data ?? personal;
  }

  // Bloquear / desbloquear usuario
  async onToggleBloqueo(usuario: any) {
    const nuevoEstado = !usuario.blocked;
    const accion = nuevoEstado ? 'bloquear' : 'desbloquear';

    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Seguro que deseas ${accion} al usuario <strong>${usuario.username}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            try {
              if (nuevoEstado) {
                await this.usuariosSrv.block(usuario.id);
              } else {
                await this.usuariosSrv.unblock(usuario.id);
              }
              usuario.blocked = nuevoEstado;
              this.presentToast(`Usuario ${accion} correctamente`);
            } catch (err) {
              console.error('Error cambiando estado blocked', err);
              this.presentToast('Error al actualizar el estado del usuario');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // ===========================
  //       CREAR USUARIO
  // ===========================

  openCreateModal() {
    this.newUser = {
      username: '',
      email: '',
      password: '',
      roleId: this.operadorRole ? this.operadorRole.id : null,
      personalNombre: '',
      personalApellidos: '',
      personalTelefono: '',
      personalRutaId: null as string | null,
    };

    this.isOperadorSelectedCreate =
      !!this.operadorRole && this.newUser.roleId === this.operadorRole.id;

    this.isCreateModalOpen = true;
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  onRoleChangeCreate(roleId: number) {
    this.newUser.roleId = roleId;
    this.isOperadorSelectedCreate =
      !!this.operadorRole && roleId === this.operadorRole.id;
  }

  async saveNewUser() {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password || !this.newUser.roleId) {
      this.presentToast('Completa todos los campos básicos para crear el usuario');
      return;
    }

    const esOperador =
      this.operadorRole && this.newUser.roleId === this.operadorRole.id;

    if (esOperador) {
      if (
        !this.newUser.personalNombre ||
        !this.newUser.personalApellidos ||
        !this.newUser.personalTelefono
      ) {
        this.presentToast(
          'Para usuarios con rol Operador debes capturar nombre, apellidos y teléfono del personal'
        );
        return;
      }

      // Validar teléfono único en personal
      const existentes = await this.personalSrv.findByTelefono(this.newUser.personalTelefono);
      if (existentes && existentes.length > 0) {
        this.presentToast('Ya existe un operador con ese teléfono. Usa otro número.');
        return;
      }
    }

    try {
      const body = {
        username: this.newUser.username,
        email: this.newUser.email,
        password: this.newUser.password,
        role: this.newUser.roleId,
        provider: 'local',
        confirmed: true,
        blocked: false,
      };

      const created = await this.usuariosSrv.create(body);

      // Si es operador, crear personal con datos y ruta (documentId, opcional)
      await this.ensurePersonalIfOperador(created, this.newUser.roleId, {
        nombre: this.newUser.personalNombre,
        apellidos: this.newUser.personalApellidos,
        telefono: this.newUser.personalTelefono,
        rutaId: this.newUser.personalRutaId ?? null,
      });

      this.usuarios.push(created);

      this.presentToast('Usuario creado correctamente');
      this.closeCreateModal();
    } catch (err) {
      console.error('Error creando usuario', err);
      this.presentToast('Error al crear el usuario');
    }
  }

  // ===========================
  //       EDITAR USUARIO
  // ===========================

  openEditModal(usuario: any) {
    // Tomamos la ruta de personal en sus posibles formas
    const rutaRaw = usuario.personal?.ruta;
    const rutaObj = rutaRaw?.data ?? rutaRaw ?? null;

    const rutaDocumentId = rutaObj?.documentId || null;

    this.editUser = {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      roleId: usuario.role?.id || null,
      blocked: usuario.blocked,
      personalNombre: usuario.personal?.nombre || '',
      personalApellidos: usuario.personal?.apellidos || '',
      personalTelefono: usuario.personal?.telefono || '',
      // 👇 ya no quedará en null si la ruta viene bien populada
      personalRutaId: rutaDocumentId,
      // seguimos usando el documentId de personal para update/delete
      personalId: usuario.personal?.documentId || null,
    };

    this.isOperadorSelectedEdit =
      !!this.operadorRole && this.editUser.roleId === this.operadorRole.id;

    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
  }

  onRoleChangeEdit(roleId: number) {
    this.editUser.roleId = roleId;
    this.isOperadorSelectedEdit =
      !!this.operadorRole && roleId === this.operadorRole.id;
  }

  async saveEditUser() {
    if (!this.editUser.id || !this.editUser.username || !this.editUser.email || !this.editUser.roleId) {
      this.presentToast('Completa los datos obligatorios');
      return;
    }

    const seraOperador =
      this.operadorRole && this.editUser.roleId === this.operadorRole.id;

    if (seraOperador) {
      if (
        !this.editUser.personalNombre ||
        !this.editUser.personalApellidos ||
        !this.editUser.personalTelefono
      ) {
        this.presentToast(
          'Para usuarios con rol Operador debes capturar nombre, apellidos y teléfono del personal'
        );
        return;
      }

      // Validar teléfono único en personal (ignorando su propio personalDocumentId)
      const existentes = await this.personalSrv.findByTelefono(this.editUser.personalTelefono);
      const lista = existentes || [];

      const otros = lista.filter((p: any) => {
        return p.documentId !== this.editUser.personalId;  
      });

      if (otros.length > 0) {
        this.presentToast('Ese teléfono ya está asignado a otro operador.');
        return;
      }
    }

    const idxOriginal = this.usuarios.findIndex(u => u.id === this.editUser.id);
    const usuarioOriginal = idxOriginal > -1 ? this.usuarios[idxOriginal] : null;

    try {
      const body = {
        username: this.editUser.username,
        email: this.editUser.email,
        role: this.editUser.roleId,
        blocked: this.editUser.blocked,
      };

      const updated = await this.usuariosSrv.update(this.editUser.id, body);

      const idx = this.usuarios.findIndex(u => u.id === this.editUser.id);
      if (idx > -1) {
        this.usuarios[idx] = {
          ...this.usuarios[idx],
          ...updated,
        };
      }

      if (this.operadorRole && usuarioOriginal) {
        const eraOperador =
          usuarioOriginal.role?.id === this.operadorRole.id;
        const seraOperadorFinal =
          this.editUser.roleId === this.operadorRole.id;

        const userRef = this.usuarios[idx];

        // Caso 1: era operador y ya NO lo será -> eliminar personal
        if (eraOperador && !seraOperadorFinal && usuarioOriginal.personal?.documentId) {
          await this.personalSrv.delete(usuarioOriginal.personal.documentId);
          userRef.personal = null;
        }

        // Caso 2: no era operador y ahora SÍ lo será -> crear personal
        if (!eraOperador && seraOperadorFinal) {
          await this.ensurePersonalIfOperador(userRef, this.editUser.roleId, {
            nombre: this.editUser.personalNombre || this.editUser.username,
            apellidos: this.editUser.personalApellidos,
            telefono: this.editUser.personalTelefono,
            rutaId: this.editUser.personalRutaId ?? null,
          });
        }

        // Caso 3: sigue siendo operador -> actualizar personal
        if (eraOperador && seraOperadorFinal) {
          if (this.editUser.personalId) {
            const updatedPersonal = await this.personalSrv.update(this.editUser.personalId, {
              nombre: this.editUser.personalNombre || this.editUser.username,
              apellidos: this.editUser.personalApellidos,
              telefono: this.editUser.personalTelefono,
              ruta: this.editUser.personalRutaId ?? null,
            });

            userRef.personal = updatedPersonal.data ?? updatedPersonal;
          } else {
            // Por si acaso no tenía personal pero ya era operador
            await this.ensurePersonalIfOperador(userRef, this.editUser.roleId, {
              nombre: this.editUser.personalNombre || this.editUser.username,
              apellidos: this.editUser.personalApellidos,
              telefono: this.editUser.personalTelefono,
              rutaId: this.editUser.personalRutaId ?? null,
            });
          }
        }
      }

      this.presentToast('Usuario actualizado correctamente');
      this.closeEditModal();
    } catch (err) {
      console.error('Error actualizando usuario', err);
      this.presentToast('Error al actualizar el usuario');
    }
  }

  private async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
