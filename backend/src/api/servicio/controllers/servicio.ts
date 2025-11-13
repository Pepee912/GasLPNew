// backend/src/api/servicio/controllers/servicio.ts

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::servicio.servicio', ({ strapi }) => ({

  getRoleFlags(user: any) {
    const roleName = user?.role?.name?.toLowerCase() || '';

    return {
      roleName,
      isOperador: roleName === 'operador',
      isAdmin: roleName === 'administrador',
      isCallCenter: roleName === 'callcenter',
    };
  },

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
        // Operador: mismos filtros por ruta + que la ruta sea del operador
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

  async find(ctx) {
    const user = ctx.state?.user;

    if (!user) {
      return await super.find(ctx);
    }

    const { isOperador } = this.getRoleFlags(user);

    if (isOperador) {
      // Operador: solo sus servicios (de cualquier día)
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
      // Admin / Callcenter
      ctx.query = {
        ...ctx.query,
        populate: '*',
      };
    }

    return await super.find(ctx);
  },

  // normalizar estado_servicio al crear
  async create(ctx) {
    const user = ctx.state?.user || null;
    const bodyData = ctx.request.body?.data || {};
    const newData: any = { ...bodyData };

    const { isOperador } = user ? this.getRoleFlags(user) : { isOperador: false };

    if (bodyData.estado_servicio) {
      // Operador no debería fijar el estado al crear
      if (isOperador) {
        delete newData.estado_servicio;
      } else {
        newData.estado_servicio = {
          connect: [bodyData.estado_servicio], 
        };
      }
    }

    ctx.request.body.data = newData;

    const result = await super.create(ctx);
    return result;
  },

  async update(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('No autenticado');
    }

    const { isOperador } = this.getRoleFlags(user);
    const documentId = ctx.params.id;
    const bodyData = ctx.request.body?.data || {};

    // Helper: normalizar estado_servicio a formato connect
    const normalizeEstadoRelation = (raw: any) => {
      if (!raw) return undefined;

      // Permitimos enviar tanto id numérico como documentId string
      return {
        connect: [raw],
      };
    };

    if (isOperador) {
      // Verifica que el servicio realmente pertenece a su ruta
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

      console.log('Servicio a modificar por operador', servicio);

      if (!servicio) {
        return ctx.unauthorized('No tienes permiso para actualizar este servicio');
      }

      const dataToSave: any = {};

      // El operador solo cambia estado_servicio y fechas relacionadas
      if (bodyData.estado_servicio) {
        const rel = normalizeEstadoRelation(bodyData.estado_servicio);
        if (rel) dataToSave.estado_servicio = rel;
      }

      if (bodyData.fecha_surtido) {
        dataToSave.fecha_surtido = bodyData.fecha_surtido;
      }

      if (bodyData.fecha_cancelado) {
        dataToSave.fecha_cancelado = bodyData.fecha_cancelado;
      }

      ctx.request.body.data = dataToSave;
    } else {
      // Admin / Callcenter: pueden mandar más campos,
      // pero normalizamos igual estado_servicio si viene
      const newData: any = { ...bodyData };

      if (bodyData.estado_servicio) {
        const rel = normalizeEstadoRelation(bodyData.estado_servicio);
        if (rel) {
          newData.estado_servicio = rel;
        }
      }

      ctx.request.body.data = newData;
    }

    const result = await super.update(ctx);
    return result;
  },

}));
