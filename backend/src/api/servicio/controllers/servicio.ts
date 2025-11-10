/**
 * servicio controller
 */

import { factories } from '@strapi/strapi'
import servicio from '../routes/servicio';

export default factories.createCoreController('api::servicio.servicio', {
    
  async getServiciosByRuta(ctx) {
    
  },

  async find(ctx) {
    const user = ctx.state?.user;

    if (!user) {
      return await super.find(ctx);
    }

    if (user.role?.type === 'operador') {

      // Modificar el ctx para agregar el filtro por usuario
      ctx.query = {
        ...ctx.query, 
        populate: {
          domicilio: true,
          estado_servicio: true,
          tipo_servicio: true,
        },
      };

      // Operador, solo sus servicios
      ctx.query.filters = {
      ruta: { personal: { users_permissions_user: { id: { $eq: user.id } } } }
      };

    } else {
      // Administrador y Callcenter 
      ctx.query = {
        ...ctx.query, // mantener los filtros originales
        populate: '*',
      };
    }

    return await super.find(ctx);
  },

  // ---------------------------------------------

  async update(ctx){
    const user = ctx.state.user;
    const documentId = ctx.params.id;

    if(user.role.type === 'operador'){
      //console.log(ctx.request.body.data);

      const servicio = await strapi.documents('api::servicio.servicio').findOne({
        documentId: documentId,

        filters: {
          ruta: {
            personal: {
              users_permissions_user: {
                id: {
                  $eq: user.id
                }
              }
            }
          }
        }

      })

      console.log("Servicio a modificar", servicio)

      // Si el servicio no pertenece al usuario retornar error
      if(!servicio){
        ctx.unauthorized("No tienes permiso para actualizar este servicio")
      }

      ctx.request.body.data = {
        "estado_servicio": ctx.request.body.data.estado_servicio
      };
    }
    const result = await super.update(ctx);
    return result;

  }

  // ---------------------------------------------

  

});
