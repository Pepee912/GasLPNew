import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::servicio.servicio',
  ({ strapi }) => ({

    // --------------------- Helpers de rol ---------------------
    getRoleFlags(user: any) {
      const roleName = user?.role?.name?.toLowerCase() || '';

      return {
        roleName,
        isOperador: roleName === 'operador',
        isAdmin: roleName === 'administrador',
        isCallCenter: roleName === 'callcenter',
      };
    },

    getEstadosPermitidosOperador() {
      return ['Asignado', 'Surtido', 'Cancelado'];
    },

    // ===================== GET /serviciosbyruta/:documentId =====================
    async getServiciosByRuta(ctx) {
      const user = ctx.state?.user || null;
      const rutaDocumentId = ctx.params.documentId;

      let filters: any;
      let populate: any;

      if (!user) {
        filters = {
          ruta: {
            documentId: { $eq: rutaDocumentId },
          },
        };
        populate = '*';
      } else {
        const { isOperador } = this.getRoleFlags(user);

        if (isOperador) {
          // Operador: solo servicios de ESA ruta, SU usuario y SOLO estados permitidos
          filters = {
            ruta: {
              documentId: { $eq: rutaDocumentId },
              personal: {
                users_permissions_user: {
                  id: { $eq: user.id },
                },
              },
            },
            estado_servicio: {
              tipo: { $in: this.getEstadosPermitidosOperador() },
            },
          };

          populate = {
            domicilio: true,
            estado_servicio: true,
            tipo_servicio: true,
            cliente: true,
            ruta: true,
          };
        } else {
          // Admin / Callcenter / otros: todos los servicios de esa ruta
          filters = {
            ruta: {
              documentId: { $eq: rutaDocumentId },
            },
          };
          populate = '*';
        }
      }

      const servicios = await strapi
        .documents('api::servicio.servicio')
        .findMany({
          filters,
          populate,
          sort: { fecha_programado: 'asc' },
        });

      return servicios;
    },

    // ===================== GET /servicios/hoy =====================
    async getServiciosHoy(ctx) {
      const user = ctx.state?.user || null;

      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const baseFilters: any = {
        fecha_programado: {
          $gte: start.toISOString(),
          $lt: end.toISOString(),
        },
      };

      let filters: any;
      let populate: any;

      if (!user) {
        filters = baseFilters;
        populate = '*';
      } else {
        const { isOperador } = this.getRoleFlags(user);

        if (isOperador) {
          // Operador: solo servicios de hoy, SU ruta y estados permitidos
          filters = {
            ...baseFilters,
            ruta: {
              personal: {
                users_permissions_user: {
                  id: { $eq: user.id },
                },
              },
            },
            estado_servicio: {
              tipo: { $in: this.getEstadosPermitidosOperador() },
            },
          };

          populate = {
            domicilio: true,
            estado_servicio: true,
            tipo_servicio: true,
            cliente: true,
            ruta: true,
          };
        } else {
          // Admin / Callcenter: todos los servicios de hoy
          filters = baseFilters;
          populate = '*';
        }
      }

      const serviciosHoy = await strapi
        .documents('api::servicio.servicio')
        .findMany({
          filters,
          populate,
          sort: { fecha_programado: 'asc' },
        });

      return serviciosHoy;
    },

    // ===================== GET /servicios (listado general) =====================
    async find(ctx) {
      const user = ctx.state?.user;

      if (!user) {
        // invitado (raro, pero por si acaso)
        return await super.find(ctx);
      }

      const { isOperador } = this.getRoleFlags(user);

      if (isOperador) {
        // Operador: solo servicios de SU ruta y estados Asignado/Surtido/Cancelado
        ctx.query = {
          ...ctx.query,
          populate: {
            domicilio: true,
            estado_servicio: true,
            tipo_servicio: true,
            cliente: true,
            ruta: true,
          },
          filters: {
            ruta: {
              personal: {
                users_permissions_user: {
                  id: { $eq: user.id },
                },
              },
            },
            estado_servicio: {
              tipo: { $in: this.getEstadosPermitidosOperador() },
            },
          },
        };
      } else {
        // Admin / Callcenter: todo con populate completo
        ctx.query = {
          ...ctx.query,
          populate: '*',
        };
      }

      return await super.find(ctx);
    },

    // ===================== POST /servicios =====================
    async create(ctx) {
      const user = ctx.state?.user || null;
      const bodyData = ctx.request.body?.data || {};
      const newData: any = { ...bodyData };

      const { isOperador } = user ? this.getRoleFlags(user) : { isOperador: false };

      // Normalizar estado_servicio al crear
      if (bodyData.estado_servicio) {
        if (isOperador) {
          // Operador NO define estado al crear
          delete newData.estado_servicio;
        } else {
          newData.estado_servicio = {
            connect: [bodyData.estado_servicio],
          };
        }
      }

      // nota_operador normalmente no aplica al crear, pero si viniera la ignoramos
      if (isOperador && 'nota_operador' in newData) {
        delete newData.nota_operador;
      }

      ctx.request.body.data = newData;

      const result = await super.create(ctx);
      return result;
    },

    // ===================== PUT /servicios/:id =====================
    async update(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('No autenticado');
      }

      const { isOperador } = this.getRoleFlags(user);
      const documentId = ctx.params.id;
      const bodyData = ctx.request.body?.data || {};

      // Helper: normalizar relación estado_servicio
      const normalizeEstadoRelation = (raw: any) => {
        if (!raw) return undefined;
        return {
          connect: [raw], // puede ser id numérico o documentId string
        };
      };

      // ---- 1) Si viene un nuevo estado_servicio, lo buscamos y validamos ----
      let nuevoEstado: any | null = null;
      const nuevoEstadoRaw = bodyData.estado_servicio;

      if (nuevoEstadoRaw) {
        const filters: any = {};

        // Si es número → id, si no → documentId
        if (!isNaN(Number(nuevoEstadoRaw))) {
          filters.id = { $eq: Number(nuevoEstadoRaw) };
        } else {
          filters.documentId = { $eq: nuevoEstadoRaw };
        }

        nuevoEstado = await strapi
          .documents('api::estado-servicio.estado-servicio')
          .findFirst({ filters });

        if (!nuevoEstado) {
          return ctx.badRequest('Estado de servicio inválido');
        }

        // Si es operador, solo puede marcar Surtido
        if (isOperador && nuevoEstado.tipo !== 'Surtido') {
          return ctx.forbidden('Solo puedes marcar el servicio como "Surtido".');
        }
      }

      // ==================== ROL OPERADOR ====================
      if (isOperador) {
        const servicio = await strapi
          .documents('api::servicio.servicio')
          .findOne({
            documentId,
            filters: {
              ruta: {
                personal: {
                  users_permissions_user: {
                    id: { $eq: user.id },
                  },
                },
              },
            },
          });

        if (!servicio) {
          return ctx.unauthorized('No tienes permiso para actualizar este servicio');
        }

        const dataToSave: any = {};

        if (nuevoEstado) {
          dataToSave.estado_servicio = normalizeEstadoRelation(nuevoEstadoRaw);

          // Si marca Surtido → ponemos fecha_surtido y permitimos nota_operador
          if (nuevoEstado.tipo === 'Surtido') {
            dataToSave.fecha_surtido =
              bodyData.fecha_surtido || new Date().toISOString();
            dataToSave.fecha_cancelado = null;

            // nota_operador opcional
            if (typeof bodyData.nota_operador === 'string') {
              const nota = bodyData.nota_operador.trim();
              if (nota) {
                dataToSave.nota_operador = nota;
              }
            }
          }
        }

        // El operador no puede modificar otros campos
        ctx.request.body.data = dataToSave;
      }

      // ==================== ROL ADMIN / CALLCENTER ====================
      else {
        const newData: any = { ...bodyData };

        if (nuevoEstado) {
          newData.estado_servicio = normalizeEstadoRelation(nuevoEstadoRaw);

          if (nuevoEstado.tipo === 'Surtido') {
            newData.fecha_surtido =
              bodyData.fecha_surtido || new Date().toISOString();
            newData.fecha_cancelado = null;
          } else if (nuevoEstado.tipo === 'Cancelado') {
            newData.fecha_cancelado =
              bodyData.fecha_cancelado || new Date().toISOString();
            newData.fecha_surtido = null;
          } else if (
            nuevoEstado.tipo === 'Programado' ||
            nuevoEstado.tipo === 'Asignado'
          ) {
            // Estados "normales": limpiamos fechas de surtido/cancelado
            newData.fecha_surtido = null;
            newData.fecha_cancelado = null;
          }
        }

        // Permitir editar nota_operador también desde admin/callcenter
        if (typeof bodyData.nota_operador === 'string') {
          const nota = bodyData.nota_operador.trim();
          newData.nota_operador = nota || null;
        }

        ctx.request.body.data = newData;
      }

      const result = await super.update(ctx);
      return result;
    },

  })
);
