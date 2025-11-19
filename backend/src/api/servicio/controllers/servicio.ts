import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::servicio.servicio', ({ strapi }) => ({

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
        // Operador: solo servicios de ESA ruta y que la ruta sea del operador
        filters = {
          ruta: {
            documentId: { $eq: rutaDocumentId },
            personal: {
              users_permissions_user: {
                id: { $eq: user.id },
              },
            },
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
        // Operador: solo servicios de hoy de SU ruta
        filters = {
          ...baseFilters,
          ruta: {
            personal: {
              users_permissions_user: {
                id: { $eq: user.id },
              },
            },
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
      // Operador: solo servicios de su ruta (cualquier día)
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
    let estadoRaw: any = bodyData.estado_servicio;

    // Soporte para array u objeto
    if (Array.isArray(estadoRaw)) {
      if (estadoRaw.length === 0) {
        estadoRaw = null;
      } else {
        const first = estadoRaw[0];
        if (first && typeof first === 'object') {
          estadoRaw = first.documentId || first.id || null;
        } else {
          estadoRaw = first;
        }
      }
    } else if (estadoRaw && typeof estadoRaw === 'object') {
      estadoRaw = estadoRaw.documentId || estadoRaw.id || null;
    }

    if (estadoRaw) {
      if (isOperador) {
        // Operador NO define estado al crear
        delete newData.estado_servicio;
      } else {
        newData.estado_servicio = {
          connect: [estadoRaw],
        };
      }
    } else {
      // Si no hay valor válido, no tocamos la relación
      delete newData.estado_servicio;
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

    // ---------------------------------------
    // 1) Leemos y normalizamos lo que venga en bodyData.estado_servicio
    // ---------------------------------------
    let nuevoEstado: any | null = null;
    let nuevoEstadoRaw: any = bodyData.estado_servicio;

    // Flag para saber si el frontend está intentando CAMBIAR el estado
    let quiereCambiarEstado = false;

    if (nuevoEstadoRaw !== undefined) {
      // Si vino en el body, aunque sea null o [], algo quieren hacer
      quiereCambiarEstado = true;
    }

    // 🔹 Si viene como array (admin panel o algún cliente)
    if (Array.isArray(nuevoEstadoRaw)) {
      if (nuevoEstadoRaw.length === 0) {
        // [] → NO queremos tocar la relación
        nuevoEstadoRaw = null;
      } else {
        const first = nuevoEstadoRaw[0];
        if (first && typeof first === 'object') {
          nuevoEstadoRaw = first.documentId || first.id || null;
        } else {
          nuevoEstadoRaw = first;
        }
      }
    }

    // 🔹 Si viene como objeto ({ id, documentId, tipo, ... })
    if (nuevoEstadoRaw && typeof nuevoEstadoRaw === 'object') {
      if (nuevoEstadoRaw.documentId) {
        nuevoEstadoRaw = nuevoEstadoRaw.documentId;
      } else if (nuevoEstadoRaw.id) {
        nuevoEstadoRaw = String(nuevoEstadoRaw.id);
      } else {
        nuevoEstadoRaw = null;
      }
    }

    // Si después de normalizar no hay valor (null, '', 0...),
    // interpretamos que NO queremos tocar la relación.
    if (!nuevoEstadoRaw) {
      nuevoEstadoRaw = null;
    }

    // Solo si hay un valor real buscamos el estado
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

    // IMPORTANTE: si vino estado_servicio pero al final nuevoEstadoRaw es null,
    // eliminamos la propiedad del body para NO desconectar la relación.
    if (quiereCambiarEstado && !nuevoEstadoRaw) {
      delete bodyData.estado_servicio;
    }

    if (isOperador) {
      // ---------------------------------------
      // Operador: solo sus servicios y solo Surtido
      // ---------------------------------------
      const servicio = await strapi
        .documents('api::servicio.servicio')
        .findOne({
          documentId,
          filters: {
            ruta: {
              personals: {
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

      if (nuevoEstado && nuevoEstadoRaw) {
        dataToSave.estado_servicio = normalizeEstadoRelation(nuevoEstadoRaw);

        // Si marca Surtido, ponemos fecha_surtido ahora
        if (nuevoEstado.tipo === 'Surtido') {
          dataToSave.fecha_surtido =
            bodyData.fecha_surtido || new Date().toISOString();
          // limpieza de cancelado por si antes estaba cancelado
          dataToSave.fecha_cancelado = null;
        }
      }

      // El operador NO puede cambiar nada más desde aquí
      ctx.request.body.data = dataToSave;
    } else {
      // ---------------------------------------
      // Admin / Callcenter
      // ---------------------------------------
      const newData: any = { ...bodyData };

      if (nuevoEstado && nuevoEstadoRaw) {
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
      } else {
        // Si vino estado_servicio en el body pero al final no se resolvió a un estado válido,
        // NO dejamos que pase null/[] a Strapi (evitamos que desconecte la relación)
        if (quiereCambiarEstado && !nuevoEstadoRaw) {
          delete newData.estado_servicio;
        }
      }

      ctx.request.body.data = newData;
    }

    const result = await super.update(ctx);
    return result;
  },

}));
