// backend/src/api/servicio/controllers/servicio.ts

/**
 * servicio controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::servicio.servicio', ({ strapi }) => ({

  // ---------------------------------------------------------------------------
  // Helpers de rol
  // ---------------------------------------------------------------------------
  getRoleFlags(user: any) {
    const roleName = user?.role?.name?.toLowerCase() || '';

    return {
      roleName,
      isOperador: roleName === 'operador',
      isAdmin: roleName === 'administrador',
      isCallCenter: roleName === 'callcenter',
    };
  },

  // ---------------------------------------------------------------------------
  // GET /serviciosbyruta/:documentId
  // ---------------------------------------------------------------------------
  async getServiciosByRuta(ctx) {
    const user = ctx.state?.user || null;
    const rutaDocumentId = ctx.params.documentId;

    let filters: any;
    let populate: any;

    if (!user) {
      // Sin autenticación: solo filtra por ruta
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

  // ---------------------------------------------------------------------------
  // GET /servicios/hoy
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // GET /servicios  (lista general)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // PUT /servicios/:id
  // ---------------------------------------------------------------------------
  async update(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('No autenticado');
    }

    const { isOperador } = this.getRoleFlags(user);
    const documentId = ctx.params.id;

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

      console.log('Servicio a modificar', servicio);

      if (!servicio) {
        return ctx.unauthorized('No tienes permiso para actualizar este servicio');
      }

      // Restringe los campos que puede modificar el operador
      ctx.request.body.data = {
        estado_servicio: ctx.request.body.data.estado_servicio,
      };
    }

    const result = await super.update(ctx);
    return result;
  },

}));
