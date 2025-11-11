/**
 * servicio controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::servicio.servicio', ({ strapi }) => ({


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
    } else if (user.role?.type === 'operador') {
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
      };
    } else {
      filters = {
        ruta: {
          documentId: { $eq: rutaDocumentId },
        },
      };
      populate = '*';
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
    } else if (user.role?.type === 'operador') {
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
      };
    } else {
      filters = baseFilters;
      populate = '*';
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
  // GET /servicios
  // ---------------------------------------------------------------------------
  async find(ctx) {
    const user = ctx.state?.user;

    if (!user) {
      return await super.find(ctx);
    }

    if (user.role?.type === 'operador') {
      ctx.query = {
        ...ctx.query,
        populate: {
          domicilio: true,
          estado_servicio: true,
          tipo_servicio: true,
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
    const documentId = ctx.params.id;

    if (user.role?.type === 'operador') {
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

      ctx.request.body.data = {
        estado_servicio: ctx.request.body.data.estado_servicio,
      };
    }

    const result = await super.update(ctx);
    return result;
  },

}));
