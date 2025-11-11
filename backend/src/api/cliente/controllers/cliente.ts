/**
 * cliente controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::cliente.cliente', ({ strapi }) => ({

  // ========= CREAR CLIENTE =========
  async create(ctx) {
    // Strapi v5 normalmente recibe { data: { ... } }
    const body = ctx.request.body as any;
    const data = body?.data ?? body;
    const telefono = data?.telefono;

    if (telefono) {
      const existente = await strapi.documents('api::cliente.cliente').findFirst({
        filters: {
          telefono: {
            $eq: telefono,
          },
        },
      });

      if (existente) {
        // Teléfono ya usado por otro cliente
        return ctx.throw(400, 'Ya existe un cliente con ese número telefónico.');
      }
    }

    // Si pasa la validación, delega al core controller
    return await super.create(ctx);
  },

  // ========= ACTUALIZAR CLIENTE =========
  async update(ctx) {
    const { id } = ctx.params; // en documents API, suele ser el documentId

    const body = ctx.request.body as any;
    const data = body?.data ?? body;
    const telefono = data?.telefono;

    if (telefono) {
      const existente = await strapi.documents('api::cliente.cliente').findFirst({
        filters: {
          telefono: {
            $eq: telefono,
          },
          // Evitar chocar con el propio documento que estamos editando
          documentId: {
            $ne: id,
          },
        },
      });

      if (existente) {
        return ctx.throw(400, 'Ya existe otro cliente con ese número telefónico.');
      }
    }

    return await super.update(ctx);
  },

  // ========= BUSCAR POR TELÉFONO =========
  // Ruta típica: GET /clientes/telefono/:id
  // (revisa tu routes.ts para confirmar el param, pero ya usas ctx.params.id)
  async findbByPhone(ctx) {
    const tel = ctx.params.id;
    console.log('Teléfono a buscar: ', tel);

    const cliente = await strapi.documents('api::cliente.cliente').findFirst({
      populate: {
        domicilios: true,
      },
      filters: {
        telefono: {
          $eq: tel,
        },
      },
    });

    if (!cliente) {
      return ctx.throw(404, 'Cliente no encontrado');
    }

    console.log('Cliente encontrado: ', cliente);

    // Lo devolvemos "plano", como ya lo estabas haciendo.
    // Tu front ya maneja el caso en el que venga directo el objeto o dentro de { data }.
    return cliente;
  },

}));
